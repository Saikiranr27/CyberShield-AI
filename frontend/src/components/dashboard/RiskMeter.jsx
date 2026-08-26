import React, { memo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { COLORS, SEVERITY, SEVERITY_ORDER } from "../../constants/theme.js";
import { riskColor, riskLabel } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";

function RiskMeter({ score, severityCounts }) {
  const radius = 70;
  const stroke = 10;
  const circ = 2 * Math.PI * radius;
  const pct = score / 100;
  const color = riskColor(score);
  const label = riskLabel(score);

  return (
    <Panel title="RISK SCORE" icon={ShieldAlert} iconColor={COLORS.red}>
      <div className="flex flex-col items-center">
        <div className="relative w-[170px] h-[170px]">
          <svg width="170" height="170" className="-rotate-90" role="img" aria-label={`Overall risk score: ${score} out of 100, ${label}`}>
            <circle cx="85" cy="85" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
            <motion.circle
              cx="85"
              cy="85"
              r={radius}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - pct) }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="font-display text-3xl font-black" style={{ color }}>
              {score}
            </span>
            <span className="font-mono text-[10px] text-white/40 tracking-widest">/ 100</span>
          </div>
        </div>
        <span
          className="font-mono text-[10px] tracking-widest mt-2 px-2.5 py-1 rounded-full"
          style={{ color, background: `${color}18` }}
        >
          {label.toUpperCase()}
        </span>

        <div className="grid grid-cols-2 gap-2 w-full mt-5">
          {SEVERITY_ORDER.map((key) => (
            <div key={key} className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: SEVERITY[key].color, boxShadow: `0 0 6px ${SEVERITY[key].color}` }}
                aria-hidden="true"
              />
              <span className="text-white/50">{SEVERITY[key].label}</span>
              <span className="ml-auto text-white/80">{severityCounts?.[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default memo(RiskMeter);
