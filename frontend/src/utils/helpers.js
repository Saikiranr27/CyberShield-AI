import { SEVERITY } from "../constants/theme.js";

/**
 * Merge conditional class names, filtering out falsy values.
 * Lightweight alternative to the `clsx` / `classnames` packages.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Resolve the display color for a given severity key. */
export function severityColor(severity) {
  return SEVERITY[severity]?.color ?? SEVERITY.low.color;
}

/** Resolve an overall risk color from a 0-100 score. */
/** Risk bands: 0-20 Low, 21-40 Medium, 41-70 High, 71-100 Critical. Mirrors backend utils/helpers.risk_label. */
export function riskColor(score) {
  if (score >= 71) return SEVERITY.critical.color;
  if (score >= 41) return SEVERITY.high.color;
  if (score >= 21) return SEVERITY.medium.color;
  return SEVERITY.low.color;
}

export function riskLabel(score) {
  if (score >= 71) return "Critical";
  if (score >= 41) return "High";
  if (score >= 21) return "Medium";
  return "Low";
}

/** Promise-based delay, used to simulate async scan steps in mock mode. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a short, reasonably-unique id (scan ids, log entry keys, etc). */
export function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Format an ISO date string / Date into a short, readable timestamp. */
export function formatTimestamp(date = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Basic client-side validation for a scan target.
 * Accepts hostnames, URLs, and IPv4 addresses. Not exhaustive —
 * real validation belongs server-side, this only gates obviously-empty input.
 */
export function isValidTarget(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostnameOrUrl = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;
  return ipv4.test(trimmed) || hostnameOrUrl.test(trimmed);
}

/** Deterministic pseudo-random IP generated from a target string (mock data only). */
export function mockIpFromTarget(target) {
  let hash = 0;
  for (let i = 0; i < target.length; i++) {
    hash = (hash << 5) - hash + target.charCodeAt(i);
    hash |= 0;
  }
  const bytes = [
    100 + (Math.abs(hash) % 100),
    Math.abs(hash >> 8) % 256,
    Math.abs(hash >> 16) % 256,
    1 + (Math.abs(hash >> 24) % 254),
  ];
  return bytes.join(".");
}
