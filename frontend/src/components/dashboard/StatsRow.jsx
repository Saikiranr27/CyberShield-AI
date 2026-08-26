import React, { memo } from "react";
import { ShieldCheck, ShieldAlert, Network, Cpu, Server, Bug, Clock } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { riskColor } from "../../utils/helpers.js";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="cs-glass rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} color={color} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-bold leading-tight truncate" style={{ color }}>
          {value}
        </div>
        <div className="text-[10px] font-mono text-white/40 tracking-wide truncate">{label}</div>
      </div>
    </div>
  );
}

function StatsRow({ results }) {
  const risk = results?.riskScore ?? 0;
  const security = Math.max(0, 100 - risk);
  const counts = results?.portsSummary?.stateCounts ?? {};
  const dnsTotal = (results?.dnsRecordCounts ?? []).reduce((sum, d) => sum + d.count, 0);
  const durationMs = results?.scanMeta?.durationMs;

  const stats = [
    { icon: ShieldCheck, label: "SECURITY SCORE", value: `${security}`, color: riskColor(risk) },
    { icon: ShieldAlert, label: "RISK SCORE", value: `${risk}`, color: riskColor(risk) },
    { icon: Network, label: "OPEN PORTS", value: counts.open ?? 0, color: COLORS.green },
    { icon: Network, label: "CLOSED PORTS", value: counts.closed ?? 0, color: "#8b96a8" },
    { icon: Network, label: "FILTERED PORTS", value: counts.filtered ?? 0, color: COLORS.orange },
    { icon: Cpu, label: "TECHNOLOGIES", value: results?.technologies?.length ?? 0, color: COLORS.blue },
    { icon: Server, label: "DNS RECORDS", value: dnsTotal, color: COLORS.cyan },
    { icon: Bug, label: "FINDINGS", value: results?.findings?.length ?? 0, color: COLORS.red },
    {
      icon: Clock,
      label: "SCAN DURATION",
      value: durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "—",
      color: "#8b96a8",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}

export default memo(StatsRow);
