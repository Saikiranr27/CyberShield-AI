# CyberSentinel AI — Project Documentation

Overview
--------
CyberSentinel AI is a full-stack authorized security assessment platform.
Frontend: React + Vite + Tailwind. Backend: Flask + SQLite + network modules.
The backend runs exactly six modules: Port Scanner, Vulnerability Scanner,
SSL Analyzer, DNS Lookup, WHOIS Lookup, and Technology Fingerprinting.

Architecture
------------
- Frontend (frontend/) calls Flask API at `/api/*`.
- Flask app (backend/app.py) exposes blueprints: `/api/scan`, `/api/results/<id>`, `/api/history`, `/api/report/<id>`.
- Modules live in `backend/modules/` and are executed concurrently by `api/scan.py`.
- Results are persisted in SQLite (`backend/database/cybersentinel.db`) and PDF reports are generated under `backend/scans/`.

API Endpoints
-------------
- GET /api/health — basic health check
- POST /api/scan — start a synchronous scan. Body: `{ "target": "example.com", "modules": ["port scanner", "vulnerability scanner", ...] }`.
- GET /api/results/<scan_id> — fetch full saved scan result JSON
- GET /api/history?limit=50 — list recent scans (summary)
- DELETE /api/history/<scan_id> — delete a scan (not used by UI by default)
- GET /api/report/<scan_id>?format=pdf|json|csv — download report

Database
--------
Single `scans` table with JSON-encoded columns: `scan_id`, `target`, `timestamp`, `modules`, `results`, `risk_score`, `target_info`, `findings`, `recommendations`, `scan_meta`.
See `backend/database/models.py` for DDL and `backend/database/database.py` for migration logic.

Risk Scoring
------------
The risk score is computed in `backend/utils/analysis.py`:
- Each finding has a severity mapped to a numeric score: `critical=9.5`, `high=7.5`, `medium=5.0`, `low=2.5`.
- The final risk score is the rounded sum of all finding scores, capped to 0–100.
- Bands (displayed in UI): 0–20 Low, 21–50 Medium, 51–75 High, 76–100 Critical.

Module summaries
----------------
- Port Scanner: uses `python-nmap` (shells out to `nmap`) when available, else a TCP connect socket fallback. Returns every scanned port (open/closed/filtered) with service/version/reason and risk. Separate `-O` OS detection attempted as a best-effort probe (requires root).
- Vulnerability Scanner: passive and safe active checks — missing security headers, dangerous HTTP methods (OPTIONS), cookie flags, robots.txt disclosure, directory exposure probes (bounded list), and simple misconfigurations.
- SSL Analyzer: real TLS handshake inspection (`ssl` + `openssl s_client` for full chain). Returns certificate details, issuer, subject, TLS version, cipher, days remaining, and a heuristic grade (A+/A/B/C/D/F).
- DNS Lookup: uses `dnspython` to resolve A/AAAA/MX/TXT/NS/CNAME/SOA and performs PTR reverse lookups for discovered IPs.
- WHOIS Lookup: wraps `python-whois` and normalizes registrar, creation/expiration/updated dates, name servers, status.
- Technology Fingerprinting: detects server/framework/CMS from HTTP headers and HTML markup; versions extracted only when the target discloses them.

Security & Safety Notes
----------------------
- Only scan systems you own or are explicitly authorized to test.
- Input validation and sanitization are applied (`backend/utils/helpers.py`).
- Dangerous modules are intentionally non-destructive; no exploitation is performed.
- `nmap -O` (OS detection) requires root and is isolated so it never aborts the main scan if unavailable.

Operational Requirements
------------------------
- Recommended on Kali Linux (nmap and openssl preinstalled). For full features install system `nmap` and `openssl`.
- Python dependencies: install `backend/requirements.txt`.
- Frontend: Node 18+ and `npm install` inside `frontend/`.

Known Limitations
-----------------
- WHOIS queries may fail if outbound port 43 is blocked by the environment.
- Full certificate chain retrieval relies on system `openssl`; if it's missing the chain is omitted.
- OS detection via nmap requires root; non-root runs will not provide OS guesses.
- This tool performs network requests; scan performance depends on network latency and target responsiveness.
