import React, { memo, useMemo } from "react";
import { History } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";
import { formatTimestamp } from "../../utils/helpers.js";

function RecentLogs({ logs }) {
  const recent = useMemo(() => logs.slice(-8).reverse(), [logs]);

  return (
    <Panel title="RECENT LOGS" icon={History} iconColor={COLORS.blue}>
      {recent.length === 0 ? (
        <p className="text-[12px] text-white/30 font-mono">No activity yet.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto cs-scrollbar pr-1">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-[11px] font-mono">
              <span className="text-white/25 shrink-0">{formatTimestamp(new Date())}</span>
              <span style={{ color: entry.level === "success" ? COLORS.green : "#8b96a8" }}>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default memo(RecentLogs);
