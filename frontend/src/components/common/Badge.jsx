import React, { memo } from "react";
import { severityColor } from "../../utils/helpers.js";

/** Small pill label used for severity ("critical") or state ("open") tags. */
function Badge({ children, color, severity, className = "" }) {
  const resolvedColor = color || (severity ? severityColor(severity) : "#8b96a8");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${className}`}
      style={{ color: resolvedColor, background: `${resolvedColor}18` }}
    >
      {children}
    </span>
  );
}

export default memo(Badge);
