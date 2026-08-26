import React, { memo } from "react";
import { CheckCircle2, Loader2, Circle, XCircle, MinusCircle, ListChecks } from "lucide-react";
import { COLORS, MODULE_STATUS } from "../../constants/theme.js";
import { MODULES } from "../../constants/modules.js";
import Panel from "../common/Panel.jsx";

const STATUS_META = {
  [MODULE_STATUS.PENDING]: { icon: Circle, color: "#5b6779", label: "pending" },
  [MODULE_STATUS.RUNNING]: { icon: Loader2, color: COLORS.orange, label: "running" },
  [MODULE_STATUS.DONE]: { icon: CheckCircle2, color: COLORS.green, label: "completed" },
  [MODULE_STATUS.FAILED]: { icon: XCircle, color: COLORS.red, label: "failed" },
  [MODULE_STATUS.SKIPPED]: { icon: MinusCircle, color: "#5b6779", label: "skipped" },
};

function ModuleStatusList({ selectedModules, moduleStatuses }) {
  const modules = selectedModules
    .map((id) => MODULES.find((m) => m.id === id))
    .filter(Boolean);

  return (
    <Panel title="MODULE STATUS" icon={ListChecks} iconColor={COLORS.cyan}>
      <ul className="space-y-2" aria-label="Scan module status">
        {modules.map((mod) => {
          const status = moduleStatuses[mod.id] ?? MODULE_STATUS.PENDING;
          const meta = STATUS_META[status];
          const StatusIcon = meta.icon;
          return (
            <li key={mod.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex items-center gap-2 text-white/70 truncate">
                <mod.icon size={13} className="shrink-0 text-white/40" aria-hidden="true" />
                <span className="truncate">{mod.label}</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] shrink-0" style={{ color: meta.color }}>
                <StatusIcon size={12} className={status === MODULE_STATUS.RUNNING ? "animate-spin" : ""} aria-hidden="true" />
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default memo(ModuleStatusList);
