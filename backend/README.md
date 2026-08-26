# CyberSentinel AI — Backend

Production-ready Flask backend for the CyberSentinel AI security scanning platform.

## Requirements

- Python 3.10+ (developed against 3.13; every module uses
  `from __future__ import annotations`, so 3.10+ is sufficient)
- `nmap` binary (recommended — Port Scanner falls back to a pure-Python socket
  connect-scan if it's missing, but you lose service/version detection and OS
  fingerprinting)
- `openssl` CLI (recommended — used only for retrieving the full TLS
  certificate chain in SSL Analyzer; everything else in that module works
  without it)

## Kali Linux quick start

Kali ships `nmap` and `openssl` out of the box, so this is close to zero-setup:

```bash
sudo apt update && sudo apt install -y python3-venv   # if not already present
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The server starts on `http://0.0.0.0:5000`.

**No `sudo` required to run this app for 5 of the 6 modules.** Port Scanner's
default `NMAP_ARGS` is `-sT` (a TCP connect scan), which doesn't need
root/raw-socket privileges. **OS detection is the one exception**: nmap's `-O`
flag requires root, and — this matters — if you're not root, nmap doesn't
just skip OS detection, it aborts the entire invocation (exit code 1, verified
directly). Because of that, OS detection is implemented as a **separate,
isolated, best-effort probe** (see `modules/port_scanner.py`'s `_detect_os()`)
that never touches the main port scan: run as non-root and you'll simply see
`"Operating System: Not detected (requires root privileges)"` while every
other Port Scanner field (open/closed/filtered ports, services, versions)
works normally. Run the backend as root (or with `CAP_NET_RAW`) if you want
real OS fingerprints.

## Setup (other platforms)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Project Structure

```
backend/
├─ app.py                        # Flask app factory, blueprint registration, error handlers
├─ config.py                     # Environment-driven configuration
├─ extensions.py                 # Shared Flask-Limiter instance
├─ requirements.txt
├─ .env.example
├─ api/
│  ├─ scan.py                    # POST /api/scan, GET /api/results/<scan_id>
│  ├─ reports.py                 # GET /api/report/<scan_id>
│  └─ history.py                 # GET /api/history
├─ modules/                      # Exactly 6 modules, per spec
│  ├─ port_scanner.py             # every scanned port (open/closed/filtered) +
│  │                                 OS detection (isolated, best-effort, see above)
│  ├─ vulnerability_scanner.py    # headers, dangerous HTTP methods, cookies,
│  │                                 directory exposure, misconfigurations
│  ├─ dns_lookup.py               # A/AAAA/MX/TXT/NS/CNAME/SOA/PTR, each with real TTL
│  ├─ whois_lookup.py             # registrar, dates, status, name servers, registrant country
│  ├─ ssl_analyzer.py             # cipher, key algorithm, SAN, full chain, security grade
│  ├─ technology_fingerprint.py   # + regex-extracted version numbers where disclosed
│  └─ target_info.py              # always-on: resolved IP, reverse DNS, live status,
│                                     IP geolocation (ip-api.com, best-effort), OS passthrough
├─ reports/
│  └─ pdf_report.py              # reportlab-based PDF; renders the same findings/
│                                    recommendations the JSON API returns
├─ database/
│  ├─ database.py                # SQLite access layer + backward-compatible migration
│  └─ models.py                  # Schema DDL + ScanRecord dataclass
├─ utils/
│  ├─ logger.py                  # Centralized logging setup
│  ├─ helpers.py                 # Target sanitization, shared HTTP fetch, risk_label bands
│  └─ analysis.py                # Single source of truth for findings, recommendations,
│                                    and the 0-100 risk score — used by both the JSON API
│                                    and the PDF report
└─ scans/                        # Generated PDF reports are written here
```

## API

### `POST /api/scan`

```json
{
  "target": "scanme.nmap.org",
  "modules": ["Port Scanner", "Vulnerability Scanner", "SSL Analyzer", "DNS Lookup"]
}
```

Accepted module names (case-insensitive) — exactly 6: `Port Scanner`,
`Vulnerability Scanner`, `DNS Lookup`, `WHOIS Lookup`, `SSL Analyzer`,
`Technology Fingerprinting`.

All requested modules run **concurrently** (`concurrent.futures.ThreadPoolExecutor`,
see `api/scan.py`) — they're mutually independent I/O-bound calls, so this is
a real wall-clock speedup, not just apparent parallelism. If one module fails
or raises unexpectedly, it's isolated to `results["<module>"] = {"error": ...}`
and every other module still completes normally — a single module failure
never aborts the scan.

Response:

```json
{
  "status": "success",
  "scan_id": "5b1b1e9e-...-uuid",
  "results": {
    "scan_id": "...",
    "target": "scanme.nmap.org",
    "timestamp": "2026-08-01T12:00:00+00:00",
    "modules": ["port_scanner", "vulnerability_scanner", "ssl_analyzer", "dns_lookup"],
    "results": { "port_scanner": { ... }, "vulnerability_scanner": { ... }, ... },
    "risk_score": 32,
    "target_info": { "hostname": "...", "ip_address": "...", "operating_system": "...", "live": true, ... },
    "findings": [
      { "id": "...", "module": "vulnerability_scanner", "module_label": "Vulnerability Scanner",
        "severity": "high", "title": "...", "description": "...", "recommendation": "...", "score": 7.5 }
    ],
    "recommendations": [
      { "title": "...", "detail": "...", "severity": "high" }
    ]
  }
}
```

`risk_score` bands (see `utils/helpers.risk_label`): **0–20 Low, 21–40 Medium,
41–70 High, 71–100 Critical.**

### `GET /api/results/<scan_id>` / `GET /api/history?limit=50` / `GET /api/health`

Unchanged shapes from prior versions — see `api/history.py` / `api/reports.py`
for the exact response bodies.

### `GET /api/report/<scan_id>`

`?format=pdf` (default, unchanged) streams back a generated PDF with a cover
page, executive summary, scan details, target information, risk score,
recommendations, and per-module findings — sourced from the same
`utils/analysis.py` output as the JSON API. `?format=json` returns the full
scan record as JSON; `?format=csv` returns ports + findings + recommendations
as CSV.

All error responses are JSON: `{"status": "error", "message": "..."}` — no stack traces
are ever returned to the client (they're logged server-side via `utils/logger.py`).

## Data enrichment notes

- **IP geolocation** (`target_info.py`'s country/region/city/ISP/ASN fields)
  calls the free `ip-api.com` JSON API with the target's resolved IP — a real
  third-party lookup, not a fabricated value. Best-effort: on any failure
  those fields are left `null`. This does mean the target's IP is sent to
  `ip-api.com`; remove the `_geolocate()` call in `modules/target_info.py` if
  that's not acceptable for your use case.
- **OS detection** is a probabilistic guess, exactly as nmap itself frames it
  ("JUST GUESSING") — surfaced as `{"name", "accuracy", "family"}` with the
  real confidence percentage, never presented as certain.
- **SSL "security grade"** (A+/A/B/C/D/F) is an explicit, documented
  heuristic (protocol version + cipher strength + validity), not an official
  Qualys SSL Labs grade — each result includes its own `reason` string.
  `weak_tls`/`weak_cipher` are explicit booleans derived from the same
  handshake data.
- **Full certificate chain** is retrieved via the `openssl` CLI
  (`s_client -showcerts`) since Python's standard `ssl` module doesn't expose
  it without Python 3.13+ or an extra TLS library. If `openssl` isn't
  installed, `certificate_chain` is simply `[]` — never fabricated.
- **Vulnerability Scanner's** directory-exposure check makes one baseline
  request to a random nonexistent path first, to detect "soft 404" custom
  error pages that return HTTP 200 for everything — this prevents every
  checked path from being (incorrectly) flagged as exposed on such sites.
  It also checks `robots.txt` for `Disallow` entries that hint at sensitive
  paths.
- **CVSS/CWE/OWASP** on every finding (`utils/analysis.py`) use MITRE's and
  OWASP's own published classifications for that weakness *type* (e.g.
  missing HSTS → CWE-319 / OWASP A02:2021) — not a fabricated
  target-specific CVSS vector. Findings with no meaningful standard mapping
  (e.g. "domain expiring soon") leave `cwe`/`owasp` as `null` rather than
  forcing one.
- **Port Scanner version detection** (`-sV`) can be noticeably slower on
  unusual networks. If you're testing behind a corporate proxy, VPN, or any
  environment that intercepts/rewrites raw TCP as HTTP, nmap's service
  probes can take much longer than on a normal network (this is inherent to
  how `-sV` works, not a bug) — `NMAP_ARGS`'s `--host-timeout` and the
  automatic empty-hosts fallback (see Round 4 changelog in the root README)
  both guard against this hanging or silently returning nothing.

## Database migrations

Adding new columns to an existing `cybersentinel.db` is handled automatically:
`database.py`'s `_migrate_schema()` runs `PRAGMA table_info` on startup and
`ALTER TABLE ... ADD COLUMN` for anything missing, without touching existing
rows. New installs get the full schema straight from `CREATE_SCANS_TABLE`.

## Security notes

- `utils/helpers.sanitize_target()` is a hard validation boundary: it strips
  any URL scheme/path, rejects anything that isn't a syntactically valid
  hostname or IP, and explicitly rejects values starting with `-` (which
  would otherwise be interpreted as a CLI flag by the underlying `nmap`
  binary). This is the **only** place a raw target reaches the scanning
  modules.
- `api/reports.py` validates that `scan_id` is a well-formed UUID before it's
  used to build a filesystem path, preventing path traversal.
- CORS is restricted to the origins listed in `CORS_ORIGINS` (defaults to the
  local Vite dev server).
- **Rate limiting** (Flask-Limiter, `extensions.py`): `POST /api/scan` is
  limited to `RATELIMIT_SCAN` (default 5/min per client IP — scans are
  expensive: nmap + ~15 HTTP requests + TLS handshakes + DNS/WHOIS); every
  other endpoint uses `RATELIMIT_DEFAULT` (60/min). In-memory storage by
  default (fine for a single process); set `RATELIMIT_STORAGE_URI` to a
  Redis URL for multi-worker production deployments so limits are shared.
- **Secure response headers** are set on every API response
  (`app.py`'s `after_request` hook): `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Cache-Control: no-store`.
- Vulnerability Scanner's directory-exposure and dangerous-method checks are
  spot-checks against a small, fixed, well-known list — not a brute-force
  directory buster — to keep scan time and target load bounded.
- The Port Scanner's default port range and timeouts are intentionally
  bounded (see `.env.example`) to keep a single HTTP request from running
  indefinitely.

## Performance notes

- All 6 modules run **concurrently** per scan (`ThreadPoolExecutor`, default
  6 workers, configurable via `SCAN_MAX_WORKERS`) — these are I/O-bound calls
  (sockets, DNS, TLS handshakes, HTTP) that release the GIL while waiting.
- **Vulnerability Scanner** and **Technology Fingerprinting** share a single
  initial HTTP GET via a request-scoped, lock-protected cache instead of each
  fetching the target independently.
- The Flask dev server (`python app.py`) is single-worker by default, which
  is fine for local/authorized testing but not concurrent multi-user load.
  For anything beyond that, run behind a production WSGI server (e.g.
  `gunicorn -w 4 -b 0.0.0.0:5000 app:app`) — the SQLite layer opens one
  short-lived connection per request, so it's safe under multiple workers.

## Notes on scope

This tool performs **passive/light-active reconnaissance and reporting**
(port/service/OS discovery, header/method/cookie/directory checks, TLS
inspection, DNS/WHOIS lookups, technology fingerprinting). It does not
perform exploitation, brute forcing, or any destructive action against a
target. Only scan systems you own or are explicitly authorized to test.
