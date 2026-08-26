import React, { memo } from "react";
import { ScanLine } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { MODULES } from "../../constants/modules.js";
import ModuleCard from "./ModuleCard.jsx";

function ModuleGrid({ selected, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-white/40">
          <ScanLine size={13} style={{ color: COLORS.blue }} aria-hidden="true" /> SELECT MODULES
        </div>
        <div className="font-mono text-xs text-white/30">
          {selected.length} / {MODULES.length} ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="group" aria-label="Scan modules">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} selected={selected.includes(mod.id)} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

export default memo(ModuleGrid);
