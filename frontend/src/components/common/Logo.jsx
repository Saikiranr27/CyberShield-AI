import React from "react";
import { Shield } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function Logo({ size = "text-xl" }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 select-none">
      <div className="relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="absolute inset-0 rounded-md rotate-45"
          style={{ border: `1.5px solid ${COLORS.cyan}`, boxShadow: `0 0 10px ${COLORS.cyan}88` }}
        />
        <Shield size={15} color={COLORS.cyan} strokeWidth={2.4} />
      </div>
      <span className={`min-w-0 whitespace-nowrap font-display font-bold tracking-[0.04em] sm:tracking-wider ${size}`} style={{ color: "#fff" }}>
        CYBER<span style={{ color: COLORS.cyan }}>SENTINEL</span>
        <span className="text-[0.6em] align-top ml-1" style={{ color: COLORS.blue }}>
          AI
        </span>
      </span>
    </div>
  );
}
