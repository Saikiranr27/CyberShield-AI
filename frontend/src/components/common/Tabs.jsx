import React from "react";
import { COLORS } from "../../constants/theme.js";
import { cn } from "../../utils/helpers.js";

/**
 * Simple local-state tab bar (not routed) used to organize the dashboard's
 * scan-result sections (Overview / Ports / DNS / SSL & Web / Technologies /
 * Findings) without one long scrolling page.
 */
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto cs-scrollbar pb-px border-b"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-mono tracking-wide transition-colors focus-ring rounded-t-md",
              isActive ? "text-cyan-300" : "text-white/45 hover:text-white/75"
            )}
          >
            {tab.icon && <tab.icon size={13} aria-hidden="true" />}
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none"
                style={{ background: isActive ? `${COLORS.cyan}22` : "rgba(255,255,255,0.06)", color: isActive ? COLORS.cyan : "#8b96a8" }}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                style={{ background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}` }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
