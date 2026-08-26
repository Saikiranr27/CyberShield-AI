import React, { memo, useEffect, useMemo, useState } from "react";
import { Network, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { severityColor } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";
import Badge from "../common/Badge.jsx";
import SearchInput from "../common/SearchInput.jsx";

const STATE_FILTERS = ["all", "open", "closed", "filtered"];
const STATE_COLOR = { open: COLORS.green, closed: "#8b96a8", filtered: COLORS.orange };
const PAGE_SIZE = 10;

const COLUMNS = [
  { key: "port", label: "PORT" },
  { key: "service", label: "SERVICE" },
  { key: "state", label: "STATE" },
  { key: "product", label: "PRODUCT" },
  { key: "version", label: "VERSION" },
  { key: "risk", label: "RISK" },
  { key: "recommendation", label: "RECOMMENDATION", sortable: false },
];

function SortHeader({ col, sortKey, sortDir, onSort }) {
  const active = sortKey === col.key;
  if (col.sortable === false) {
    return <th scope="col" className="pb-2 pr-4 font-normal">{col.label}</th>;
  }
  return (
    <th
      scope="col"
      className="pb-2 pr-4 font-normal cursor-pointer select-none hover:text-white/60 transition-colors"
      onClick={() => onSort(col.key)}
    >
      <span className="flex items-center gap-1">
        {col.label}
        {active && (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      </span>
    </th>
  );
}

function PortsTable({ ports, summary }) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortKey, setSortKey] = useState("port");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = ports ?? [];
    if (stateFilter !== "all") rows = rows.filter((p) => p.state === stateFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          String(p.port).includes(q) ||
          (p.service ?? "").toLowerCase().includes(q) ||
          (p.product ?? "").toLowerCase().includes(q) ||
          (p.version ?? "").toLowerCase().includes(q) ||
          (p.state ?? "").toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [ports, search, stateFilter, sortKey, sortDir]);

  // Reset to page 1 whenever the filtered set changes shape (new search/filter/sort).
  useEffect(() => setPage(1), [search, stateFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const counts = summary?.stateCounts ?? { open: 0, closed: 0, filtered: 0 };

  return (
    <Panel title="NMAP PORT SCAN RESULTS" icon={Network} iconColor={COLORS.blue}>
      <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] font-mono">
        <span className="text-white/40">
          Scanned: <span className="text-white/75">{summary?.totalScanned ?? ports?.length ?? 0}</span>
        </span>
        <span style={{ color: STATE_COLOR.open }}>Open: {counts.open}</span>
        <span style={{ color: STATE_COLOR.closed }}>Closed: {counts.closed}</span>
        <span style={{ color: STATE_COLOR.filtered }}>Filtered: {counts.filtered}</span>
        {summary?.resolvedIp && <span className="text-white/30">→ {summary.resolvedIp}</span>}
        {summary?.engine && (
          <span className="ml-auto text-white/25">
            engine: {summary.engine}
            {summary.scanDurationMs != null && ` · ${summary.scanDurationMs}ms`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search port, service, product, version..." className="flex-1 min-w-[160px]" />
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Filter by state">
          {STATE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-mono capitalize transition-colors focus-ring border"
              style={{
                borderColor: stateFilter === s ? `${COLORS.cyan}66` : "rgba(255,255,255,0.08)",
                color: stateFilter === s ? COLORS.cyan : "#8b96a8",
                background: stateFilter === s ? `${COLORS.cyan}14` : "transparent",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!ports || ports.length === 0 ? (
        <p className="text-[12px] text-white/30 py-6 text-center">No port scan data available.</p>
      ) : (
        <>
          <div className="overflow-x-auto cs-scrollbar">
            <table className="w-full text-left font-mono text-[12px]">
              <caption className="sr-only">Every scanned port with state, service, product, version, risk, and recommendation</caption>
              <thead>
                <tr className="text-white/35 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {COLUMNS.map((col) => (
                    <SortHeader key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr
                    key={p.port}
                    className="border-b hover:bg-white/[0.02] transition-colors align-top"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    <td className="py-2 pr-4 text-white/85">{p.port}</td>
                    <td className="py-2 pr-4 text-white/60">{p.service || "unknown"}</td>
                    <td className="py-2 pr-4">
                      <Badge color={STATE_COLOR[p.state]}>{p.state}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-white/50">{p.product || "-"}</td>
                    <td className="py-2 pr-4 text-white/50">{p.version || "-"}</td>
                    <td className="py-2 pr-4">
                      {p.risk && p.risk !== "none" ? (
                        <span className="flex items-center gap-1.5" style={{ color: severityColor(p.risk) }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: severityColor(p.risk) }} aria-hidden="true" />
                          {p.risk}
                        </span>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                    <td className="py-2 text-white/40 max-w-[220px] truncate" title={p.recommendation || undefined}>
                      {p.recommendation || "-"}
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-white/30">
                      No ports match your search/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-[11px] font-mono text-white/40" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span>
                Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="p-1.5 rounded-md border disabled:opacity-30 focus-ring"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>
                <span>
                  Page {pageSafe} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className="p-1.5 rounded-md border disabled:opacity-30 focus-ring"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  aria-label="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export default memo(PortsTable);
