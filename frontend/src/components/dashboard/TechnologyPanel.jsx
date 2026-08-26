import React, { memo, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";
import SearchInput from "../common/SearchInput.jsx";

function TechnologyPanel({ technologies, error }) {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const list = (technologies ?? []).filter((t) =>
      search ? t.name.toLowerCase().includes(search.toLowerCase()) : true
    );
    const byCategory = {};
    for (const t of list) {
      byCategory[t.category] = byCategory[t.category] ?? [];
      byCategory[t.category].push(t);
    }
    return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));
  }, [technologies, search]);

  if (error) {
    return (
      <Panel title="TECHNOLOGY FINGERPRINTING" icon={Cpu} iconColor={COLORS.red}>
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.red }}>
          {error}
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="TECHNOLOGY FINGERPRINTING" icon={Cpu} iconColor={COLORS.cyan}>
      {!technologies ? (
        <p className="text-[12px] text-white/30 py-6 text-center">Technology Fingerprinting was not run for this scan.</p>
      ) : technologies.length === 0 ? (
        <p className="text-[12px] text-white/30 py-6 text-center">No technologies detected.</p>
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search technologies..." className="mb-3" />
          <div className="space-y-4 max-h-96 overflow-y-auto cs-scrollbar pr-1">
            {grouped.map(([category, techs]) => (
              <div key={category}>
                <div className="text-[11px] text-white/35 mb-2 font-mono tracking-widest">{category.toUpperCase()}</div>
                <div className="flex flex-wrap gap-2">
                  {techs.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-mono"
                      style={{ color: COLORS.blue, background: `${COLORS.blue}14`, border: `1px solid ${COLORS.blue}33` }}
                      title={t.evidence}
                    >
                      {t.name}
                      {t.version && <span className="text-white/40">v{t.version}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && <p className="text-[12px] text-white/30 py-4 text-center">No matches.</p>}
          </div>
        </>
      )}
    </Panel>
  );
}

export default memo(TechnologyPanel);
