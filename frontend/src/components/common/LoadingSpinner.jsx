import React from "react";
import { COLORS } from "../../constants/theme.js";

/**
 * Cyber-styled loading state. Used as the React.lazy Suspense fallback for
 * page-level code splitting, and inline anywhere content is being fetched.
 */
export default function LoadingSpinner({ label = "Loading...", fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className="relative w-10 h-10" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: COLORS.cyan, borderRightColor: COLORS.cyan, filter: `drop-shadow(0 0 6px ${COLORS.cyan})` }}
        />
      </div>
      <span className="font-mono text-xs tracking-widest text-white/40">{label}</span>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
      {content}
    </div>
  );
}
