import React, { memo, useMemo, useState } from "react";
import { Server, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { cn } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";
import SearchInput from "../common/SearchInput.jsx";
import CopyButton from "../common/CopyButton.jsx";

const RECORD_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "PTR"];

function RecordGroup({ type, records, search }) {
  const [open, setOpen] = useState(records.length > 0 && records.length <= 5);

  const filtered = search
    ? records.filter((r) => r.value.toLowerCase().includes(search.toLowerCase()))
    : records;

  if (search && filtered.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors focus-ring"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-mono text-[12px]" style={{ color: COLORS.blue }}>
          {type}
          <span className="text-white/30">({records.length})</span>
        </span>
        <ChevronDown size={13} className={cn("text-white/40 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-white/25">No records.</p>
          ) : (
            filtered.map((rec, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 text-[11.5px] font-mono hover:bg-white/[0.02]">
                <span className="text-white/70 break-all flex-1 min-w-0">{rec.value}</span>
                {rec.ttl != null && <span className="text-white/25 shrink-0">TTL {rec.ttl}s</span>}
                <CopyButton value={rec.value} label="Copy value" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DnsPanel({ dns }) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    if (!dns) return [];
    return RECORD_TYPES.map((type) => ({ type, records: dns[type] ?? [] })).filter((g) => g.records.length > 0);
  }, [dns]);

  return (
    <Panel title="DNS RECORDS" icon={Server} iconColor={COLORS.orange}>
      {!dns ? (
        <p className="text-[12px] text-white/30 py-6 text-center">No DNS data available.</p>
      ) : groups.length === 0 ? (
        <p className="text-[12px] text-white/30 py-6 text-center">No DNS records found for this domain.</p>
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search DNS record values..." className="mb-3" />
          <div className="space-y-2 max-h-96 overflow-y-auto cs-scrollbar pr-1">
            {groups.map((g) => (
              <RecordGroup key={g.type} type={g.type} records={g.records} search={search} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

export default memo(DnsPanel);
