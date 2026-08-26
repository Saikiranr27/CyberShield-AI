import React, { memo } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { severityColor } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";

function Recommendations({ recommendations }) {
  return (
    <Panel title="AI REMEDIATION RECOMMENDATIONS" icon={Zap} iconColor={COLORS.cyan}>
      <ul className="space-y-3" aria-label="AI remediation recommendations">
        {(recommendations ?? []).map((r, i) => (
          <li key={i} className="flex gap-3 rounded-lg p-3 border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${severityColor(r.severity)}18` }}
              aria-hidden="true"
            >
              <AlertTriangle size={13} color={severityColor(r.severity)} />
            </div>
            <div>
              <p className="text-[13px] text-white/85 font-medium leading-snug m-0">{r.title}</p>
              <p className="text-[12px] text-white/40 mt-0.5 leading-snug m-0">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default memo(Recommendations);
