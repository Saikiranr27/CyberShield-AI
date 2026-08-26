import React, { memo } from "react";
import { CheckCircle2 } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

function ModuleCard({ mod, selected, onToggle }) {
  const Icon = mod.icon;
  return (
    <button
      type="button"
      onClick={() => onToggle(mod.id)}
      aria-pressed={selected}
      className="group relative text-left rounded-xl p-4 cs-glass transition-all duration-200 overflow-hidden focus-ring"
      style={{
        borderColor: selected ? COLORS.cyan : "rgba(255,255,255,0.08)",
        boxShadow: selected ? `0 0 0 1px ${COLORS.cyan}, 0 0 24px ${COLORS.cyan}44` : "none",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      {selected && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="w-full h-px cs-scanline"
            style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)` }}
          />
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: selected ? `${COLORS.cyan}22` : "rgba(255,255,255,0.04)",
            border: `1px solid ${selected ? COLORS.cyan : "rgba(255,255,255,0.1)"}`,
          }}
          aria-hidden="true"
        >
          <Icon size={16} color={selected ? COLORS.cyan : "#8b96a8"} />
        </div>
        <div
          className="w-4 h-4 rounded-full border flex items-center justify-center"
          style={{ borderColor: selected ? COLORS.cyan : "#3a4456", background: selected ? COLORS.cyan : "transparent" }}
          aria-hidden="true"
        >
          {selected && <CheckCircle2 size={12} color="#04121a" />}
        </div>
      </div>
      <div className="font-display text-[12.5px] font-bold tracking-wide" style={{ color: selected ? "#fff" : "#c7cfdb" }}>
        {mod.label}
      </div>
      <div className="text-[11px] text-white/35 mt-1 leading-snug">{mod.description}</div>
    </button>
  );
}

export default memo(ModuleCard);
