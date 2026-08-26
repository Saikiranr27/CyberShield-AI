/**
 * Central design tokens for CyberSentinel AI.
 * Keep this in sync with `tailwind.config.js` (theme.extend.colors.cs).
 * Importing from a single source avoids color drift between
 * inline styles (needed for dynamic glow/shadow effects) and Tailwind classes.
 */

export const COLORS = Object.freeze({
  bg: "#090D13",
  panel: "#111827",
  cyan: "#00E5FF",
  blue: "#00BFFF",
  green: "#00FF88",
  orange: "#FFB800",
  red: "#FF4D4F",
  muted: "#8b96a8",
});

export const SEVERITY = Object.freeze({
  critical: { label: "Critical", color: COLORS.red },
  high: { label: "High", color: COLORS.orange },
  medium: { label: "Medium", color: COLORS.blue },
  low: { label: "Low", color: COLORS.green },
});

export const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

export const CHART_TOOLTIP_STYLE = Object.freeze({
  background: "#0d1420",
  border: `1px solid ${COLORS.cyan}44`,
  borderRadius: 8,
  fontSize: 12,
});

export const STATUS = Object.freeze({
  IDLE: "idle",
  RUNNING: "running",
  COMPLETE: "complete",
  ERROR: "error",
});

export const MODULE_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  SKIPPED: "skipped",
});

export const FONTS = Object.freeze({
  display: "'Orbitron', sans-serif",
  body: "'Rajdhani', sans-serif",
  mono: "'JetBrains Mono', monospace",
});
