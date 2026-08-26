import React, { useEffect, useState } from "react";
import { COLORS } from "../../constants/theme.js";

const BOOT_LINES = [
  "Initializing AI Security Engine...",
  "Loading Security Modules...",
  "Threat Intelligence Connected...",
  "Ready.",
];

export default function BootSequence() {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);

  useEffect(() => {
    if (idx >= BOOT_LINES.length) return;
    const line = BOOT_LINES[idx];
    if (sub < line.length) {
      const t = setTimeout(() => setSub(sub + 1), 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIdx(idx + 1);
      setSub(0);
    }, 550);
    return () => clearTimeout(t);
  }, [idx, sub]);

  const isDone = idx >= BOOT_LINES.length;

  return (
    <div className="font-mono text-sm md:text-base h-6 flex items-center justify-center gap-2" aria-live="polite">
      {!isDone ? (
        <>
          <span style={{ color: COLORS.green }} aria-hidden="true">›</span>
          <span className="text-white/70">{BOOT_LINES[idx].slice(0, sub)}</span>
          <span className="cs-caret" style={{ color: COLORS.cyan }} aria-hidden="true">▍</span>
        </>
      ) : (
        <span style={{ color: COLORS.green }} className="cs-glow-text">
          ✓ All systems ready.
        </span>
      )}
    </div>
  );
}
