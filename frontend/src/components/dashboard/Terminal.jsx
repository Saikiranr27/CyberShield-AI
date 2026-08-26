import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function Terminal({ target, logs, running }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="cs-glass rounded-xl p-4 md:p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-white/50">
          <TerminalIcon size={13} style={{ color: COLORS.green }} aria-hidden="true" /> LIVE TERMINAL
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.red }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.orange }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.green }} />
        </div>
      </div>
      <div
        ref={boxRef}
        className="font-mono text-[12.5px] md:text-sm h-64 overflow-y-auto cs-scrollbar space-y-1.5 pr-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Live scan terminal output"
      >
        <div className="text-white/30">$ cybersentinel --target {target || "unknown"} --ai-mode active</div>
        {logs.map((l, idx) => {
          const color = l.level === "success" ? COLORS.green : l.level === "error" ? COLORS.red : "#c7cfdb";
          return (
            <motion.div key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
              <span style={{ color: l.level === "success" ? COLORS.green : l.level === "error" ? COLORS.red : COLORS.cyan }} aria-hidden="true">
                ›
              </span>
              <span style={{ color }}>{l.text}</span>
              {idx === logs.length - 1 && running && l.level !== "success" && l.level !== "error" && (
                <span className="cs-caret" style={{ color: COLORS.cyan }} aria-hidden="true">▍</span>
              )}
            </motion.div>
          );
        })}
        {logs.length === 0 && <div className="text-white/20">Awaiting scan start...</div>}
      </div>
      {running && (
        <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden rounded-xl" aria-hidden="true">
          <div
            className="w-full h-px cs-scanline"
            style={{ background: `linear-gradient(90deg, transparent, ${COLORS.green}, transparent)` }}
          />
        </div>
      )}
    </div>
  );
}
