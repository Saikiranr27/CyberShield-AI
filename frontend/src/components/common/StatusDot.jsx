import React from "react";
import { COLORS } from "../../constants/theme.js";

/** A small pulsing status indicator dot. Purely decorative — pair with visible text for meaning. */
export default function StatusDot({ color = COLORS.green, size = 8 }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full cs-pulse-ring" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
}
