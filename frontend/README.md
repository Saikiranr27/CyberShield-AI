# CyberSentinel AI — Frontend

React 18 + Vite + Tailwind CSS + Framer Motion + Recharts + React Router.
Dark cyberpunk SOC (Security Operations Center) interface, **connected to the
real Flask backend** in `../backend` (see that folder's README to run it).

## Quick start

```bash
npm install
cp .env.example .env.local   # then edit if your backend isn't on localhost:5000
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The Flask backend must
be running (see `../backend/README.md`) — the navbar's **BACKEND** indicator
shows ONLINE/OFFLINE in real time (polls `GET /api/health` every 15s).

### Build for production

```bash
npm run build
npm run preview
```

## How it talks to the backend

- `src/services/api.js` — the only file that calls `fetch`. Sends
  `POST /api/scan`, `GET /api/results/:id`, `GET /api/history`, and
  `GET /api/report/:id` (PDF download). The backend runs all 6 modules
  concurrently and returns one response (no server-side streaming); this
  file re-tells that real result in the requested narrative order
  ("Starting Scan...", "Resolving Target...", "Running Port Scan...",
  "Found N Open Ports", ...) once it arrives — `N` is always the real count
  from the response, and a step is only emitted for a module that actually
  ran. A module whose result contains an error is reported as `failed`, not
  `done` — the scan itself never aborts because one module failed.
- `src/services/adapter.js` — the only file that knows the backend's raw
  per-module response shape. It flattens `results.port_scanner`,
  `results.vulnerability_scanner`, etc. into what the dashboard components
  render. Findings, recommendations, and the risk score are computed
  **server-side** (see `backend/utils/analysis.py`) and passed straight
  through — this file just renames/flattens keys. If the backend's response
  shape ever changes, this is the only frontend file that needs to change.
- `src/constants/modules.js` — exactly the 6 module labels the backend
  supports, kept in 1:1 correspondence with `backend/config.py`'s
  `MODULE_NAME_MAP`. If you add a module on the backend, add it here too
  (and vice versa) — mismatched names get silently dropped server-side.

### Mock mode (optional, offline UI dev only)

Set `VITE_MOCK_MODE=true` to run the UI without a backend at all, using a
canned local response (`src/services/mockData.js`). No port scanning,
DNS/WHOIS, SSL inspection, or PDF generation happens in this mode — it's a
visual stand-in for frontend-only work. **Off by default.**

## Project Structure

```
frontend/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env.example
└─ src/
   ├─ main.jsx / App.jsx / index.css
   ├─ constants/           # theme.js (colors/tokens/module status), modules.js (6 scan modules)
   ├─ utils/helpers.js      # cn(), riskColor()/riskLabel(), isValidTarget(), etc.
   ├─ services/
   │  ├─ api.js              # real fetch client + narrative log sequencing
   │  ├─ adapter.js          # backend response -> dashboard shape
   │  └─ mockData.js         # offline mock mode only
   ├─ hooks/
   │  ├─ useAnalysis.jsx      # scan state (target, modules, logs, results)
   │  ├─ useTheme.jsx         # accent color + reduced-motion preference
   │  └─ useBackendHealth.js  # polls GET /api/health for the navbar indicator
   ├─ components/
   │  ├─ common/  # Logo, StatusDot, Panel, Badge, ProgressBar, LoadingSpinner, Tabs, SearchInput, CopyButton
   │  ├─ layout/    # Navbar, Sidebar, Footer
   │  ├─ landing/     # Hero, TargetInput, ModuleGrid, StartButton, ...
   │  └─ dashboard/    # Terminal, RiskMeter, Charts, TargetInfo, PortsTable, DnsPanel,
   │                     # SslPanel, VulnerabilityScannerPanel, WhoisPanel, TechnologyPanel,
   │                     # SecurityFindings, Recommendations, ModuleStatusList, RecentLogs
   └─ pages/
      ├─ Landing.jsx / Dashboard.jsx / Reports.jsx / Settings.jsx / NotFound.jsx
      #  Dashboard.jsx uses a local-state tab bar (Overview / Ports /
      #  Vulnerabilities / DNS / SSL / WHOIS / Technologies / Findings) to
      #  organize the full result set — see components/common/Tabs.jsx.
```

## Module status states

`constants/theme.js`'s `MODULE_STATUS` has 5 states: `pending`, `running`,
`done`, `failed`, `skipped`. `ModuleStatusList.jsx` renders each with a
distinct icon/color (including a red ✗ for `failed`), and the Live Terminal
renders error-level log lines in red — so a module failure is visible in two
places without ever stopping the rest of the scan.

## Notes on the data model

This backend does **passive/light-active reconnaissance and reporting** — it
has no CVE database, so "Security Findings" are derived from real signal
(missing security headers, dangerous HTTP methods, exposed sensitive paths,
CORS/directory-listing misconfigurations, expired/expiring TLS certs,
exposed high-risk ports, expiring domain registration), not fabricated CVE
entries. Findings, recommendations, and the risk score are all computed
server-side in `backend/utils/analysis.py` — the single source of truth used
by both the JSON API and the PDF report. If you add a real
vulnerability-matching module to the backend, extend `build_findings()`
there to fold it in; the frontend needs no changes.

Risk score bands (0–100): **0–20 Low, 21–40 Medium, 41–70 High, 71–100
Critical** — `utils/helpers.js`'s `riskColor()`/`riskLabel()` and the
backend's `utils/helpers.risk_label()` are kept in sync on these thresholds.
