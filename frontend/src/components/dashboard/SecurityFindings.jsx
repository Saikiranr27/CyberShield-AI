import React, { memo, useMemo, useState } from "react";
import { ShieldAlert, ChevronDown } from "lucide-react";
import { COLORS, SEVERITY, SEVERITY_ORDER } from "../../constants/theme.js";
import { cn } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";
import Badge from "../common/Badge.jsx";
import SearchInput from "../common/SearchInput.jsx";

function FindingRow({ finding }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left focus-ring"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[12px]" style={{ color: SEVERITY[finding.severity]?.color }}>
              {finding.title}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 font-mono">
              {finding.module_label ?? finding.module}
            </span>
            {finding.cwe && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 font-mono">{finding.cwe}</span>
            )}
            {finding.owasp && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 font-mono">{finding.owasp}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-white/40" title="CVSS">
            CVSS {(finding.cvss ?? finding.score)?.toFixed(1)}
          </span>
          <ChevronDown size={14} className={cn("text-white/30 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-[12px]">
          <p className="text-white/55 leading-snug">{finding.description}</p>
          {finding.evidence && (
            <p className="leading-snug font-mono text-[11px] text-white/40 bg-white/[0.03] rounded p-2 break-all">
              {finding.evidence}
            </p>
          )}
          {finding.recommendation && (
            <p className="leading-snug">
              <span className="text-white/35">Recommendation: </span>
              <span className="text-cyan-300/90">{finding.recommendation}</span>
            </p>
          )}
          {finding.reference && (
            <p className="leading-snug">
              <a
                href={finding.reference}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-white/35 hover:text-cyan-300 underline underline-offset-2 break-all"
              >
                {finding.reference}
              </a>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function SecurityFindings({ findings }) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = findings ?? [];
    if (severityFilter !== "all") list = list.filter((f) => f.severity === severityFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((f) => f.title.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
    }
    return list;
  }, [findings, search, severityFilter]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings ?? []) if (c[f.severity] !== undefined) c[f.severity] += 1;
    return c;
  }, [findings]);

  return (
    <Panel title="SECURITY FINDINGS" icon={ShieldAlert} iconColor={COLORS.red}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <button
          onClick={() => setSeverityFilter("all")}
          className="px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors focus-ring border"
          style={{
            borderColor: severityFilter === "all" ? `${COLORS.cyan}66` : "rgba(255,255,255,0.08)",
            color: severityFilter === "all" ? COLORS.cyan : "#8b96a8",
          }}
        >
          All ({findings?.length ?? 0})
        </button>
        {SEVERITY_ORDER.map((key) => (
          <button
            key={key}
            onClick={() => setSeverityFilter(key)}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-colors focus-ring border"
            style={{
              borderColor: severityFilter === key ? `${SEVERITY[key].color}66` : "rgba(255,255,255,0.08)",
              color: severityFilter === key ? SEVERITY[key].color : "#8b96a8",
            }}
          >
            {key} ({counts[key]})
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search findings..." className="mb-3" />

      {(!findings || findings.length === 0) ? (
        <p className="text-[12px] text-white/40 py-4 text-center">No findings — modules reported no notable issues.</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-white/30 py-4 text-center">No findings match your search/filter.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto cs-scrollbar pr-1" aria-label="Security findings">
          {filtered.map((f) => (
            <FindingRow key={f.id} finding={f} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default memo(SecurityFindings);
