# CyberSentinel AI

AI-styled offensive security recon platform — React (Vite) frontend + Flask backend.
Dark cyberpunk SOC interface; real port scanning, web/header inspection, SSL/DNS/WHOIS
lookups, heuristic phishing detection, and PDF reporting.

```
CyberSentinel-AI/
├─ frontend/    # React + Vite + Tailwind + Framer Motion + Recharts
└─ backend/     # Flask + python-nmap + dnspython + python-whois + reportlab
```

## Run it (two terminals)

```bash
# Terminal 1 — backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py                      # http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Open `http://localhost:5173`. The navbar's **BACKEND** indicator turns green
once it can reach `http://localhost:5000/api/health`. See `backend/README.md`
for Kali-specific notes and `frontend/README.md` for the frontend architecture.

---

## Review changelog (this pass)

A full professional review was performed against the uploaded project. The
backend was already solid; **the critical finding was that the frontend
in this zip predated the frontend↔backend integration** — it was still
running entirely in local mock mode and had never actually called the Flask
API, despite looking fully functional. Everything below was fixed with
targeted edits, preserving the existing architecture (no rewrite).

### Critical: frontend was not actually connected to the backend
- `frontend/src/services/api.js` was a mock-only stub (`MOCK_MODE` defaulted
  to `true`, and `runScan()` for the real path just returned an
  `"Live backend not configured"` error). Replaced with a real `fetch` client
  that calls `POST /api/scan`, `GET /api/results/:id`, `GET /api/history`,
  and `GET /api/report/:id`, with `VITE_MOCK_MODE=false` by default.
- `frontend/src/services/adapter.js` **was missing entirely.** This is the
  layer that maps the backend's real per-module response
  (`results.port_scanner`, `results.ssl_analyzer`, etc.) into what the
  dashboard renders. Without it, wiring the real API in would have produced
  blank/broken charts even after fixing `api.js`. Added.
- `frontend/src/constants/modules.js` listed **11 modules**, several of which
  the backend doesn't implement (Vulnerability Scanner, Packet Capture,
  Subdomain Enumeration) and one with a mismatched name (`Web Security Scan`
  vs. the backend's `Web Security Scanner`). Any scan using those would have
  had modules silently dropped server-side, or failed outright if none of
  the selected modules matched. Trimmed to the exact 8 modules the backend
  supports, with labels matching `backend/config.py`'s `MODULE_NAME_MAP`
  verbatim.
- `frontend/src/hooks/useAnalysis.jsx` read `scanResults.generatedAt`, a
  field that only existed in the old mock shape — against the real backend
  this would have stored `"Invalid Date"` into scan history. Fixed to use
  the adapter's `timestamp`/`scanId` fields, and simplified to drop the
  now-redundant local `localStorage` history cache (Reports now reads the
  real backend history — see below).

### Broken/mismatched data shape in the dashboard
- `Vulnerabilities.jsx` rendered CVE-shaped data (`id`, `cvss`) that the
  real backend never returns (it has no CVE database) — this would have
  rendered an empty, misleading "Vulnerabilities" panel. Replaced with
  `SecurityFindings.jsx`, fed by the adapter's real findings (missing
  security headers, expired/expiring TLS certs, exposed high-risk ports,
  absent firewall filtering, phishing indicators).
- `Charts.jsx`'s "Threat Timeline" chart had no backend data source at all
  (the backend doesn't track historical scans over time). Replaced with a
  **DNS Records** bar chart backed by real `dns_lookup` results. The
  "Vulnerability Severity" donut is now "Findings by Severity", fed by the
  same real findings above instead of implied CVE data.
- `Dashboard.jsx` had no UI for a failed scan (network error / backend
  down) — the screen would just sit there with a stale progress bar. Added
  an error banner with the real error message and a Retry button, plus a
  working **PDF Report** download button (previously `GET /api/report/:id`
  was implemented on the backend but nothing in the UI called it).
- `Reports.jsx` only showed a client-local list built during the current
  session — a fresh browser/device showed nothing even with scan history
  sitting in the backend's SQLite database. Rewired to fetch
  `GET /api/history` on load, with a refresh button and a per-row PDF
  download.

### New: live backend connectivity indicator
- The backend already exposed `GET /api/health`, but nothing in the
  frontend ever called it — the navbar's "SYSTEM STATUS ONLINE" badge was
  hardcoded and would say ONLINE even with the Flask server stopped. Added
  `hooks/useBackendHealth.js` (polls every 15s) and wired it into `Navbar.jsx`
  as a real ONLINE/OFFLINE/CONNECTING indicator.

### Backend performance
- Web Security Scanner and Technology Fingerprinting each independently
  fetched the target over HTTP — selecting both issued two separate
  requests to the same target for the same page. `api/scan.py` now shares
  one fetch between them per scan via a request-scoped cache kept separate
  from the JSON-serializable results (so nothing non-serializable reaches
  the database). Each module still works standalone.

### Documentation
- Both READMEs described the pre-integration architecture (mock-only
  frontend, no mention of the health endpoint or PDF download). Rewritten
  to match the actual, now-connected system, plus a Kali Linux quick-start
  section on the backend README (nmap ships preinstalled on Kali; the
  default `-sT` scan type intentionally requires no `sudo`/root).
- Added this root-level README tying the two halves together.

### Verified working end-to-end
- `pip install -r requirements.txt && python app.py` boots cleanly.
- `npm install && npm run build` compiles cleanly with the same route-level
  code-splitting as before (Landing/Dashboard/Reports/Settings/NotFound as
  separate chunks).
- A live scan (`POST /api/scan` with `target: "example.com"` and all 8
  modules) round-trips through the real adapter shape end-to-end: risk
  score, findings, DNS records, ports, and PDF report generation all
  confirmed non-empty and correctly formatted.

### Not changed
- Visual design/theme, component structure outside the files above, and
  the overall route/architecture were preserved as-is per your instructions
  — this was an integration and correctness pass, not a redesign. The
  premium dark-SOC aesthetic (glassmorphism, neon glow, animated terminal,
  scanline effects) was already close to what OpenRecon-style tools look
  like, so it was left intact rather than reworked.

---

## Round 2: critical bug fix + full data enrichment

### Critical bug: Port Scanner silently returned zero ports

Reported symptom: Port Scanner showed "done" with an empty ports table and
an empty Port Distribution chart, for a real, reachable target.

**Root cause, reproduced and verified before fixing:** `modules/port_scanner.py`
checked `if target in scanner.all_hosts(): host_info = scanner[target]` —
but `python-nmap` keys `scanner.all_hosts()` by the IP address nmap
*resolved to and reported in its XML output*, not the original hostname
string passed as `hosts=`. Installed nmap in a test environment and
confirmed directly:

```
scanner.scan(hosts='example.com', ports='80,443,22', arguments='-sT -T4')
scanner.all_hosts()             # -> ['172.66.147.243']   (an IP, not 'example.com')
'example.com' in scanner.all_hosts()   # -> False, always, for any hostname target
```

So the scan succeeded and found real open ports every time, but the code
looking for the literal hostname never found them and silently returned an
empty list — no error, no exception, just quietly wrong. Fixed by using
whichever single host key nmap actually returned (a single-target scan
only ever produces one), re-verified against a live target with the fix in
place: ports 80/443 now correctly reported open.

While fixing this, also surfaced the resolved IP itself (`resolved_ip`) so
Target Information can show it even when DNS Lookup wasn't run, and added
`scan_duration_ms` and per-port `reason` (e.g. `syn-ack`, `no-response`,
`conn-refused`, from nmap's `--reason` flag) since they were sitting right
there in the same data.

### Two more modules whose results were invisible in the UI

Also found, while investigating: `SSL Analyzer` and `Firewall Simulator`
both ran successfully and showed "done" in Module Status, but **neither had
any panel displaying their results anywhere in the dashboard** — SSL data
only ever reached the PDF report, and the firewall observation was only
surfaced indirectly (and only for one specific observation value). Both
now have dedicated panels (`SslPanel.jsx`, `FirewallPanel.jsx`).

### Backend: every module enriched with real data (no fabrication)

- **Port Scanner** — now returns *every* scanned port (open, closed, and
  filtered), not just open ones, each with protocol, service, version,
  state, reason, and a computed risk level. Verified nmap reports all
  explicitly-requested ports individually (it only summarizes/omits ports
  when scanning a large default range without `-p`).
- **Web Security Scanner** — now returns the actual *values* of present
  security headers (not just which ones are missing), a risk level per
  missing header, parsed cookies (Secure/HttpOnly/SameSite flags), the
  redirect chain with status codes, and real response timing.
- **SSL Analyzer** — now returns cipher name/bits, public key
  algorithm/size, signature algorithm, serial number, and Subject
  Alternative Names (via the `cryptography` library), plus a transparent,
  self-documenting heuristic security grade (A–F) — labeled as a heuristic,
  not an official SSL Labs score.
- **DNS Lookup** — added SOA and genuine reverse-DNS (PTR) records, and
  every record now includes its real TTL.
- **Technology Fingerprinting** — added jQuery, Tailwind CSS, Next.js, and
  Express/Node.js signatures, plus regex-based version extraction from
  whatever the target actually discloses (Server header, X-Powered-By,
  WordPress generator tag, versioned asset filenames) — never guessed.
- **Target Information** (new `modules/target_info.py`, always computed
  regardless of module selection) — resolved IP, IPv6, reverse DNS, live
  status, HTTP status, HTTPS support, server banner, response time, and
  real IP geolocation (country/region/city/ISP/ASN via `ip-api.com`,
  best-effort — see `backend/README.md`'s Data Enrichment section).
- **Findings, recommendations, and risk score are now computed server-side**
  (`utils/analysis.py`), each finding carrying a module, title, description,
  actionable recommendation, and a CVSS-like 0–10 score — and used by
  *both* the JSON API and the PDF report, eliminating the duplicate
  findings-derivation logic that previously existed separately in the
  frontend adapter and the PDF generator.
- Database schema gained `target_info`/`findings`/`recommendations`
  columns with an automatic, backward-compatible migration for existing
  `cybersentinel.db` files (tested: pre-migration rows read back cleanly).

### Frontend: dashboard rebuilt around the richer data

- **Ports** — new searchable, sortable, filterable table (`PortsTable.jsx`)
  showing every scanned port with state/service/version/reason/risk, plus
  scan totals.
- **DNS** — new `DnsPanel.jsx`: every record type, TTL, per-value copy
  button, search, expandable groups.
- **SSL & Web** — new `SslPanel.jsx` and `WebSecurityPanel.jsx` (headers
  present/missing with risk badges, cookies, redirect chain) and
  `FirewallPanel.jsx`.
- **Technologies** — new `TechnologyPanel.jsx`, grouped by category with
  versions shown when the target discloses them.
- **Findings** — `SecurityFindings.jsx` rebuilt: grouped/filterable by
  severity, searchable, expandable per finding (module, description,
  recommendation, score).
- **Charts** — expanded from 4 to 6, all backed by real fields: Port State
  Distribution, Service Categories, Risk Categories, Findings by Severity,
  Security Score, DNS Records.
- **Dashboard layout** — reorganized into tabs (Overview / Ports / DNS /
  SSL & Web / Technologies / Findings) since the amount of real data no
  longer fits comfortably in one scroll.
- `services/adapter.js` simplified into a thin pass-through (flatten/rename
  only) now that findings/recommendations/risk score live server-side.

### Verified, not assumed

- Installed `nmap` in a clean test environment specifically to reproduce
  the bug against a live target before fixing it, then re-ran the same
  live scan after the fix to confirm ports 80/443 are correctly reported.
- Ran a full 8-module live scan end-to-end (`example.com`) and inspected
  the actual JSON: resolved IP, full port list with reasons, SSL cipher/
  grade, DNS TTLs, findings, recommendations, and risk score all present
  and correctly shaped.
- Generated a PDF report from that same scan and confirmed it renders
  (5 pages, valid PDF structure) with the new Target Information and
  Findings sections.
- Ran the real, unmodified `frontend/src/services/adapter.js` (via Node,
  outside the browser) directly against that captured real backend JSON —
  zero exceptions, every field the dashboard reads resolved correctly.
- Tested the database migration by hand-creating a pre-enrichment-schema
  SQLite file and confirming `Database` auto-migrates and reads it back
  without errors.
- `npm run build` and backend import/compile checks both clean after every
  change.

---

## Round 3: restructured to the 6-module spec, OS detection, concurrency

This round implemented a new, more constrained spec: exactly 6 modules
(dropping Firewall Simulator and Phishing Detector, replacing Web Security
Scanner with a broader Vulnerability Scanner), OS detection, full TLS
certificate chains, richer WHOIS, concurrent module execution, and new
risk-score bands — while explicitly preserving the existing UI design,
colors, fonts, layout, sidebar, cards, and animations (only functionality
and data changed, no redesign).

### Safety-critical finding, verified before writing any code

The spec asked for nmap OS Detection on the Port Scanner. Before touching
anything, this was tested directly against a real target as both root and a
freshly-created non-root user:

```
# as non-root:
$ nmap -sT -O -p80 example.com
TCP/IP fingerprinting (for OS scan) requires root privileges.
QUITTING!
$ echo $?
1
```

`nmap -O` doesn't gracefully skip OS detection for a non-root user — it
**aborts the entire scan**, exit code 1, no ports scanned at all. Baking
`-O` into the main scan arguments would have silently broken Port Scanner
for every non-root install (including Kali's default non-root user).
Implemented instead as a **separate, isolated, best-effort probe**
(`modules/port_scanner.py`'s `_detect_os()`) that runs after the main scan
and can never affect its success — non-root users see `"Not detected
(requires root privileges)"`, root users get a real nmap OS guess with its
actual confidence percentage (verified: `Linux 2.6.32 (87% confidence)`
against a live target).

### Module set change (per explicit spec instruction)

- Removed: Firewall Simulator, Phishing Detector, Web Security Scanner
  (`modules/web_scanner.py`, `firewall_simulator.py`, `phishing_detector.py`
  deleted; all references removed from `api/scan.py`, `utils/analysis.py`,
  `reports/pdf_report.py`, and the frontend).
- Added: **Vulnerability Scanner** (`modules/vulnerability_scanner.py`) —
  supersedes Web Security Scanner's header analysis and cookie checks, adds
  dangerous-HTTP-method detection (real `OPTIONS` probe), sensitive
  path/directory exposure checks (a bounded, well-known list, with a
  baseline request first to filter out "soft 404" pages that return 200 for
  everything), and misconfiguration checks (directory listing, permissive/
  reflected CORS).
- Since none of the remaining 6 modules depends on another's *output* (the
  only cross-module dependency, Firewall Simulator needing Port Scanner's
  results, is gone), the orchestrator no longer needs dependency ordering at
  all.

### Two more gaps found and fixed: WHOIS and SSL had no display panels

Same pattern as the previous review round's Firewall/SSL finding: WHOIS
Lookup's result (registrar, dates, status, name servers, registrant country)
was computed but **never rendered anywhere in the UI**. Added
`WhoisPanel.jsx` and a WHOIS tab. SSL's new certificate-chain data got its
own section in the existing `SslPanel.jsx`.

### Backend enrichment

- **Port Scanner**: OS detection (above); `--reason` added to nmap args for
  real per-port reason strings (`syn-ack`, `no-response`, `conn-refused`).
- **SSL Analyzer**: full certificate chain via the `openssl` CLI
  (`s_client -showcerts`, parsed with `cryptography`) — Python's `ssl`
  module doesn't expose the intermediate chain without Python 3.13+ or an
  extra TLS library, and 3.13+-only wasn't an acceptable floor given the
  project's 3.10+ target, so this shells out to a binary that's standard on
  any Linux install rather than adding a new dependency; retries once on a
  bare connection timeout; grade scale expanded to the requested
  A+/A/B/C/D/F.
- **WHOIS Lookup**: added `updated_date`, `domain_status`, and
  `registrant_country` (verified field-mapping correctness with mocked
  python-whois data, since this sandbox's network blocks WHOIS port 43).
- **Technology Fingerprinting**: added LiteSpeed, Python/Werkzeug, Gunicorn,
  Angular, Drupal, Joomla signatures.
- **Risk score bands** changed to the spec'd 0–20/21–40/41–70/71–100
  (Low/Medium/High/Critical) in both `backend/utils/helpers.risk_label()`
  and the frontend's `riskColor()`/`riskLabel()` — verified the boundary
  values (20→Low, 21→Medium, 40→Medium, 41→High, 70→High, 71→Critical) match
  exactly on both sides.

### Concurrency (explicit spec requirement: "run independent modules concurrently")

`api/scan.py`'s orchestrator now runs every requested module in a
`ThreadPoolExecutor` instead of a sequential loop — legitimate, since these
are I/O-bound calls (sockets, DNS, TLS handshakes, HTTP) that release the
GIL while waiting. Vulnerability Scanner and Technology Fingerprinting still
share a single initial HTTP fetch via a lock-protected cache (the
double-checked-locking pattern tolerates the rare benign race of both
threads missing the cache at once — never a correctness issue, just an
occasionally-missed optimization). A live 6-module scan completed in ~10s
concurrently; the same set would take meaningfully longer sequentially given
Vulnerability Scanner alone issues ~11 requests and OS detection is a
multi-second nmap probe.

### Frontend

- `constants/modules.js` trimmed to the exact 6 backend-supported modules.
- New `VulnerabilityScannerPanel.jsx` (replaces `WebSecurityPanel.jsx` +
  `FirewallPanel.jsx`), new `WhoisPanel.jsx` (new gap fix, see above).
- `SslPanel.jsx` gained a certificate chain section; `TargetInfo.jsx` gained
  an Operating System row.
- `ModuleStatusList.jsx` and `constants/theme.js`'s `MODULE_STATUS` gained
  `failed`/`skipped` states (spec: "Completed / Failed / Skipped / Running /
  Pending") — fixed a real bug in `useAnalysis.jsx` where a module's
  `"failed"` status was being collapsed into `"done"` by a two-way ternary
  that never checked for it, which would have shown a green checkmark for a
  module that actually errored. `Terminal.jsx` also gained red styling for
  error-level log lines (previously indistinguishable from info lines).
- `services/api.js` rewritten to narrate the exact requested log sequence
  ("Starting Scan...", "Resolving Target...", "Running Port Scan...",
  "Found N Open Ports", ...) — `N` and which steps appear are always driven
  by the real response, never hardcoded, since the backend has no
  server-side streaming to narrate live.
- Dashboard tabs expanded: Overview / Ports / Vulnerabilities / DNS / SSL /
  WHOIS / Technologies / Findings.
- **UI preserved as instructed**: no new visual language was introduced —
  every new panel reuses the existing `Panel`/`Badge`/`cs-glass` components,
  the same color tokens, the same fonts, the same animation primitives
  (`Tabs.jsx`, `ProgressBar.jsx`, `motion` transitions) already established
  in the codebase.

### Verified, not assumed

- Installed `nmap` and created a real non-root Linux user specifically to
  reproduce the OS-detection privilege behavior before writing the isolation
  logic, then verified the root path separately (`Linux 2.6.32 (87%
  confidence)` against a live target).
- Verified `openssl s_client -showcerts` chain retrieval against a live
  target (3-certificate chain) before wiring it into `ssl_analyzer.py`, and
  caught/fixed a bug in the first version (wrong DN-formatting call for
  `cryptography` x509 objects) via that same live test.
- Verified WHOIS field mapping with mocked `python-whois` data (this
  sandbox's egress blocks WHOIS port 43, same limitation noted in earlier
  rounds).
- Ran a live 6-module concurrent scan end-to-end and inspected the real
  JSON: OS detection, full port list, SSL chain/grade, vulnerability
  findings, risk score, and target info all present and correctly shaped.
- Ran the real, unmodified `frontend/src/services/adapter.js` (via Node)
  directly against that captured real backend JSON — zero exceptions.
- Generated a PDF from a 6-module scan and confirmed it renders (5 pages,
  valid structure) with the new module set.
- `npm run build` and backend syntax/import checks both clean after every
  change.

---

## Round 4: CVSS/CWE/OWASP taxonomy, version detection, scan metadata, security hardening

This round enriched the existing 6-module data model rather than changing
the module set, added production-grade backend hardening (rate limiting,
secure headers), and improved frontend performance/UX polish — all while
preserving the existing cyberpunk theme, layout, sidebar, and cards exactly
as instructed.

### Found: nmap version detection (`-sV`) was never enabled

The port table has always had `product`/`version` columns, but
`NMAP_ARGS` never included `-sV` — those fields have been blank since the
feature was introduced. Fixed, and while testing the fix, found a second
real issue:

### Found: nmap can "succeed" with zero hosts on timeout, silently

With `-sV` added, `--host-timeout` can be hit before service detection
finishes; nmap then exits 0 having scanned nothing for that host — not an
exception `python-nmap` raises, so the previous code would have silently
returned an empty port list instead of falling back to the socket scanner.
Fixed: an empty host list after a "successful" nmap call now explicitly
triggers the same fallback path as a genuine nmap failure. Tuned
`--version-intensity 2 --host-timeout 40s` based on live testing (also
confirmed this sandbox's network makes `-sV` unusually slow — its egress
gateway responds to nmap's probes as an HTTP proxy regardless of target
port, which a normal network doesn't do; documented in `backend/README.md`
so it isn't mistaken for a code issue).

### CVSS / CWE / OWASP taxonomy (real mappings, not fabricated)

Every finding now carries a CVSS-like score (already existed), plus a real
CWE ID and OWASP Top 10 (2021) category and reference URL, using MITRE's
and OWASP's own published classifications for that weakness *type* (e.g.
missing HSTS → CWE-319 / A02:2021; permissive CORS → CWE-942 / A05:2021) —
not a fabricated target-specific CVSS vector. Findings without a
meaningful standard mapping (e.g. "domain expiring soon" — a business risk,
not a software weakness) are left null rather than forced. New
`robots.txt` disclosure check added to Vulnerability Scanner.

### Other real data added (all backend-computed, no placeholders)

- Port Scanner: `product`, `banner`, and a per-port `recommendation`; the
  real nmap `command_used` is now captured and surfaced.
- SSL Analyzer: explicit `weak_tls`/`weak_cipher` boolean flags.
- WHOIS: computed `domain_age_days` from the real creation date.
- Scan metadata: start/end time, duration, scanner version, command used —
  new `scan_meta` DB column, added via the existing backward-compatible
  migration mechanism (tested against a hand-built legacy schema again).
- Reports: `?format=json` and `?format=csv` added alongside the existing
  PDF (default unchanged — fully backward compatible).

### Security hardening

- **Rate limiting** (Flask-Limiter): 5/min on `POST /api/scan` (expensive:
  nmap + ~15 HTTP requests + TLS handshakes + DNS/WHOIS), 60/min default
  elsewhere. Verified live: 6 rapid scan requests → `200 200 200 200 200
  429`.
- **Secure response headers** on every API response
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cache-Control: no-store`) — the scanner now sets
  the same headers it flags targets for omitting.

### Frontend

- New `StatsRow.jsx` (Security Score, Risk Score, Open/Closed/Filtered
  Ports, Technology/DNS/Finding counts, Scan Duration) and
  `ScanDetailsPanel.jsx` (hostname, IP, target, timing, scanner version,
  copyable command) on the Overview tab.
- `PortsTable.jsx`: added Product and Recommendation columns, plus
  pagination (10 rows/page).
- `SecurityFindings.jsx`: CVSS/CWE/OWASP badges and a linked reference in
  the expanded detail view.
- New Technology Distribution chart; `WhoisPanel.jsx` shows domain age;
  `SslPanel.jsx` shows weak TLS/cipher flags; `VulnerabilityScannerPanel.jsx`
  shows robots.txt disclosures.
- New `DownloadMenu.jsx` (PDF/JSON/CSV picker) replacing the single PDF
  button on both the Dashboard and Reports page.
- New `Skeleton.jsx` — Reports' history list now shows skeleton rows while
  loading instead of a bare spinner, with a Retry button on error.
- `services/api.js`: requests now time out after 20s via `AbortController`
  (previously could hang indefinitely against a stalled backend) with a
  clear "backend may be slow or offline" message; a short-lived in-memory
  GET cache was added for `/history` and `/results/:id` (cleared
  automatically after every completed scan).
- **UI preserved as instructed**: every new element reuses the existing
  `Panel`/`Badge`/`cs-glass` components and color tokens — no new visual
  language, no redesign.

### Verified, not assumed

- Reproduced the `-sV` timeout/empty-hosts issue directly (nmap CLI and
  python-nmap) before fixing it, then re-verified the fix on a live scan.
- Live-tested rate limiting (429 after the configured threshold) and
  confirmed secure headers on real responses.
- Verified the `scan_meta` migration against a hand-built legacy-schema
  SQLite file.
- Ran a live 6-module scan and inspected real CVSS/CWE/OWASP/evidence
  values, `weak_tls`/`weak_cipher`, `domain_age_days`, and `robots_txt`.
- Ran the real, unmodified `frontend/src/services/adapter.js` (via Node)
  against that captured real backend JSON — zero exceptions.
- Generated and verified PDF (5 pages) and CSV report exports from the
  same real scan.
- `npm run build` and backend syntax/import checks both clean after every
  change; a full broken-import sweep across the frontend came back clean.
