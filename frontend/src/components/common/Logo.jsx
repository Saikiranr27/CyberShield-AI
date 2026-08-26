import React from "react";
import { Shield } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function Logo({ size = "text-xl" }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative w-8 h-8 flex items-center justify-center" aria-hidden="true">
        <div
          className="absolute inset-0 rounded-md rotate-45"
          style={{ border: `1.5px solid ${COLORS.cyan}`, boxShadow: `0 0 10px ${COLORS.cyan}88` }}
        />
        <Shield size={16} color={COLORS.cyan} strokeWidth={2.4} />
      </div>
      <span className={`font-display font-bold tracking-wider ${size}`} style={{ color: "#fff" }}>
        CYBER<span style={{ color: COLORS.cyan }}>SENTINEL</span>
        <span className="text-[0.6em] align-top ml-1" style={{ color: COLORS.blue }}>
          AI
        </span>
      </span>
    </div>
  );
}
