import { idsToLabels, backendIdToFrontendId } from "../constants/modules.js";
import { adaptScanToFrontend } from "./adapter.js";
import { sleep, generateId } from "../utils/helpers.js";
import { MOCK_LOG_STEPS, buildMockAdaptedResult, buildModulePlan } from "./mockData.js";

/**
 * ---------------------------------------------------------------------------
 * API SERVICE LAYER — connected to the real CyberSentinel AI Flask backend.
 * ---------------------------------------------------------------------------
 * Endpoints (full contract documented in backend/README.md):
 *
 *   POST /api/scan            { target, modules[] }  -> { status, scan_id, results }
 *   GET  /api/results/:id                             -> { status, scan_id, results }
 *   GET  /api/history                                  -> { status, count, history[] }
 *   GET  /api/report/:id                                -> application/pdf
 *
 * The backend runs all requested modules synchronously within one request —
 * there is no server-side streaming. `runScan` below still exposes the same
 * onLog/onModuleUpdate/onComplete/onError callback shape the UI expects, but
 * drives it from that single request/response cycle: modules are marked
 * "running" as soon as the request is sent, then resolved to "done" once the
 * response arrives, logging each module's *real* success/error outcome.
 * ---------------------------------------------------------------------------
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true"; // real backend by default
const REQUEST_TIMEOUT_MS = 120_000;
const GET_CACHE_TTL_MS = 10_000;

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Small in-memory cache for GET requests (e.g. history, a re-viewed scan's
// results) — avoids redundant refetches on quick re-renders/tab switches.
// Deliberately short-lived and process-local (no persistence): scan data
// changes when a new scan completes, so staleness risk is bounded and low.
const _getCache = new Map(); // path -> { body, expiresAt }

function _cacheGet(path) {
  const entry = _getCache.get(path);
  if (!entry || entry.expiresAt < Date.now()) {
    _getCache.delete(path);
    return null;
  }
  return entry.body;
}

function _cacheSet(path, body) {
  _getCache.set(path, { body, expiresAt: Date.now() + GET_CACHE_TTL_MS });
}

/** Clears the GET cache — called after any action that changes stored data (e.g. a completed scan). */
export function clearApiCache() {
  _getCache.clear();
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const useCache = method === "GET" && !options.skipCache;

  if (useCache) {
    const cached = _cacheGet(path);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
      ...options,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s. The backend may be slow or offline.`);
    }
    throw new Error(
      `Could not reach the CyberSentinel backend at ${API_BASE}. Is the Flask server running? (${err.message})`
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(body?.message || "Too many requests — please slow down and try again shortly.");
    }
    throw new Error(body?.message || `API request to ${path} failed with status ${response.status}.`);
  }

  if (useCache) _cacheSet(path, body);
  return body;
}

// Canonical narrative order + phrasing (spec'd exactly), independent of the
// concurrent backend's actual completion order. Only steps for modules that
// were actually selected/run are emitted — this never fabricates a step for
// a module that didn't run.
const NARRATIVE_STEPS = [
  { id: "port_scanner", text: "Running Port Scan..." },
  { id: "vulnerability_scanner", text: "Running Vulnerability Scanner..." },
  { id: "ssl_analyzer", text: "Checking SSL..." },
  { id: "dns_lookup", text: "Checking DNS..." },
  { id: "whois_lookup", text: "Running WHOIS..." },
  { id: "technology_fingerprint", text: "Fingerprinting Technologies..." },
];
const NARRATIVE_STEP_DELAY_MS = 320;

/**
 * Kick off a scan.
 *
 * @param {Object} params
 * @param {string} params.target
 * @param {string[]} params.modules - internal frontend module ids (e.g. "port-scanner")
 * @param {(entry: {id:string, text:string, level:string}) => void} params.onLog
 * @param {(moduleId: string, status: 'running'|'done'|'failed') => void} params.onModuleUpdate
 * @param {(adapted: object) => void} params.onComplete - receives the adapter's flattened shape
 * @param {(error: Error) => void} params.onError
 * @returns {() => void} best-effort cancel (suppresses late callbacks; the in-flight
 *   HTTP request itself cannot be aborted without an AbortController wired through fetch)
 */
export function runScan({ target, modules, onLog, onModuleUpdate, onComplete, onError }) {
  if (MOCK_MODE) {
    return runMockScan({ target, modules, onLog, onModuleUpdate, onComplete, onError });
  }

  let cancelled = false;

  (async () => {
    try {
      onLog({ id: generateId("log"), text: "Starting Scan...", level: "info" });
      await sleep(NARRATIVE_STEP_DELAY_MS);
      if (cancelled) return;

      onLog({ id: generateId("log"), text: "Resolving Target...", level: "info" });
      for (const id of modules) onModuleUpdate(id, "running");

      // The backend runs every requested module concurrently and returns one
      // response — there's no server-side streaming to narrate in real time.
      // What follows re-tells the *real* result in the requested narrative
      // order once it arrives; "Found N Open Ports" uses the actual count
      // from the response, never a placeholder.
      const body = await request("/scan", {
        method: "POST",
        body: JSON.stringify({ target, modules: idsToLabels(modules) }),
      });

      if (cancelled) return;

      const scan = body.results; // { scan_id, target, timestamp, modules, results, risk_score, ... }
      const ranModules = new Set(scan.modules ?? []);

      for (const step of NARRATIVE_STEPS) {
        if (!ranModules.has(step.id)) continue;
        if (cancelled) return;

        await sleep(NARRATIVE_STEP_DELAY_MS);
        const moduleResult = scan.results?.[step.id];
        const frontendId = backendIdToFrontendId(step.id);
        const failed = Boolean(moduleResult?.error);

        onLog({ id: generateId("log"), text: step.text, level: "info" });

        if (step.id === "port_scanner" && !failed) {
          const openCount = moduleResult?.total_open ?? 0;
          onLog({
            id: generateId("log"),
            text: `Found ${openCount} Open Port${openCount === 1 ? "" : "s"}`,
            level: "success",
          });
        }

        if (failed) {
          onLog({ id: generateId("log"), text: `✗ ${step.text.replace("...", "")} failed: ${moduleResult.error}`, level: "error" });
        }

        onModuleUpdate(frontendId, failed ? "failed" : "done");
      }

      if (cancelled) return;
      await sleep(NARRATIVE_STEP_DELAY_MS);
      onLog({ id: generateId("log"), text: "Calculating Risk...", level: "info" });

      await sleep(NARRATIVE_STEP_DELAY_MS);
      onLog({ id: generateId("log"), text: "Generating Report...", level: "info" });

      await sleep(NARRATIVE_STEP_DELAY_MS);
      onLog({ id: generateId("log"), text: "Scan Complete", level: "success" });

      clearApiCache();
      onComplete(adaptScanToFrontend(scan));
    } catch (err) {
      if (!cancelled) {
        onLog({ id: generateId("log"), text: `Scan failed: ${err.message}`, level: "error" });
        onError(err instanceof Error ? err : new Error("Unknown scan error"));
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}

/** Fetch a previously completed scan's results by id. */
export async function getResults(scanId) {
  if (MOCK_MODE) {
    await sleep(300);
    return buildMockAdaptedResult(scanId, "cached-target.example.com", []);
  }
  const body = await request(`/results/${scanId}`);
  return adaptScanToFrontend(body.results);
}

/** Fetch the list of past scans for the Reports page. */
export async function getHistory({ skipCache = false } = {}) {
  if (MOCK_MODE) {
    await sleep(250);
    return [];
  }
  const body = await request("/history", { skipCache });
  return (body.history ?? []).map((entry) => ({
    id: entry.scan_id,
    target: entry.target,
    riskScore: entry.risk_score,
    date: entry.timestamp,
    moduleCount: entry.modules?.length ?? 0,
  }));
}

/** Trigger a browser download of the PDF report for a completed scan. */
const REPORT_EXTENSIONS = { pdf: "pdf", json: "json", csv: "csv" };

export async function downloadReport(scanId, target, format = "pdf") {
  if (MOCK_MODE) {
    throw new Error("Reports require a connected backend (disable mock mode in Settings/.env).");
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/report/${scanId}?format=${format}`);
  } catch (err) {
    throw new Error(`Could not reach the backend to generate the report: ${err.message}`);
  }
  if (!response.ok) {
    const body = await parseJsonSafely(response);
    throw new Error(body?.message || `Report generation failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cybersentinel-report-${target || scanId}.${REPORT_EXTENSIONS[format] || "pdf"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Mock mode — local simulation used only when VITE_MOCK_MODE=true. Off by default.
// ---------------------------------------------------------------------------
function runMockScan({ target, modules, onLog, onModuleUpdate, onComplete, onError }) {
  let cancelled = false;

  (async () => {
    try {
      const plan = buildModulePlan(modules.length ? modules : ["port-scanner"]);
      const logDelay = Math.max(300, Math.round(2000 / MOCK_LOG_STEPS.length));

      const logTask = (async () => {
        for (const text of MOCK_LOG_STEPS) {
          if (cancelled) return;
          await sleep(logDelay + Math.random() * 200);
          if (cancelled) return;
          onLog({ id: generateId("log"), text, level: text.includes("complete") ? "success" : "info" });
        }
      })();

      const moduleTask = (async () => {
        for (const mod of plan) {
          if (cancelled) return;
          onModuleUpdate(mod.id, "running");
          await sleep(mod.durationMs);
          if (cancelled) return;
          onModuleUpdate(mod.id, "done");
        }
      })();

      await Promise.all([logTask, moduleTask]);
      if (cancelled) return;

      onComplete(buildMockAdaptedResult(generateId("scan"), target, modules));
    } catch (err) {
      if (!cancelled) onError(err instanceof Error ? err : new Error("Unknown mock scan error"));
    }
  })();

  return () => {
    cancelled = true;
  };
}

export const apiConfig = Object.freeze({ API_BASE, MOCK_MODE });
