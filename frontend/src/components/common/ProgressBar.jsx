import React, { memo } from "react";
import { motion } from "framer-motion";
import { COLORS } from "../../constants/theme.js";

/** Linear progress bar. Value in [0, 100]. Used for per-module and overall scan progress. */
function ProgressBar({ value, color = COLORS.cyan, label, height = 6 }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1 font-mono text-[10px] text-white/40">
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full bg-white/[0.06] overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default memo(ProgressBar);
