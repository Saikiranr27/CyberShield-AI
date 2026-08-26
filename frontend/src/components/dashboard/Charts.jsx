import React, { memo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PolarAngleAxis,
} from "recharts";
import { TrendingUp, ShieldAlert, Shield, Server, PieChart as PieChartIcon, Network, Cpu } from "lucide-react";
import { COLORS, CHART_TOOLTIP_STYLE, SEVERITY } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";

const axisTick = { fill: "#8b96a8", fontSize: 11 };
const axisLine = { stroke: "rgba(255,255,255,0.1)" };
const STATE_COLORS = { Open: COLORS.green, Closed: "#8b96a8", Filtered: COLORS.orange };

function EmptyState({ label }) {
  return <div className="h-[170px] flex items-center justify-center text-[12px] text-white/30">{label}</div>;
}

function BarPanel({ title, icon, iconColor, data, dataKey = "count", nameKey = "name", barColor, colorMap }) {
  const hasData = (data ?? []).some((d) => d[dataKey] > 0);
  return (
    <Panel title={title} icon={icon} iconColor={iconColor}>
      {!hasData ? (
        <EmptyState label="No data available." />
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey={nameKey} tick={axisTick} axisLine={axisLine} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {(data ?? []).map((entry, i) => (
                <Cell key={i} fill={colorMap ? colorMap[entry[nameKey]] ?? barColor : barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function DonutPanel({ title, icon, iconColor, data }) {
  const filtered = (data ?? []).filter((d) => d.value > 0);
  return (
    <Panel title={title} icon={icon} iconColor={iconColor}>
      {filtered.length === 0 ? (
        <EmptyState label="No data to chart." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={3}>
                {filtered.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {filtered.map((v) => (
              <span key={v.name} className="flex items-center gap-1.5 text-[11px] font-mono text-white/50">
                <span className="w-2 h-2 rounded-sm" style={{ background: v.color }} aria-hidden="true" /> {v.name}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function SecurityScoreChart({ score }) {
  return (
    <Panel title="SECURITY SCORE" icon={Shield} iconColor={COLORS.green}>
      <ResponsiveContainer width="100%" height={170}>
        <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "Score", value: score, fill: COLORS.green }]} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={8} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-[100px] mb-[64px]">
        <span className="font-display text-2xl font-black" style={{ color: COLORS.green }}>
          {score}
        </span>
        <span className="text-white/30 text-xs">/100</span>
      </div>
    </Panel>
  );
}

function Charts({ results }) {
  if (!results) return null;

  const findingsData = Object.entries(results.severityCounts ?? {}).map(([key, value]) => ({
    name: SEVERITY[key]?.label ?? key,
    value,
    color: SEVERITY[key]?.color ?? COLORS.muted,
  }));

  const dnsData = (results.dnsRecordCounts ?? []).map((d) => ({ name: d.type, count: d.count }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <BarPanel
        title="PORT STATE DISTRIBUTION"
        icon={TrendingUp}
        iconColor={COLORS.blue}
        data={results.portStateDistribution}
        barColor={COLORS.blue}
        colorMap={STATE_COLORS}
      />
      <BarPanel
        title="SERVICE CATEGORIES"
        icon={Network}
        iconColor={COLORS.cyan}
        data={results.portServiceDistribution}
        barColor={COLORS.cyan}
      />
      <DonutPanel
        title="RISK CATEGORIES"
        icon={PieChartIcon}
        iconColor={COLORS.orange}
        data={Object.entries(results.portRiskDistribution ?? {}).map(([key, value]) => ({
          name: SEVERITY[key]?.label ?? key,
          value,
          color: SEVERITY[key]?.color ?? COLORS.muted,
        }))}
      />
      <DonutPanel title="FINDINGS BY SEVERITY" icon={ShieldAlert} iconColor={COLORS.red} data={findingsData} />
      <SecurityScoreChart score={results.riskScore} />
      <BarPanel title="DNS RECORDS" icon={Server} iconColor={COLORS.orange} data={dnsData} barColor={COLORS.orange} />
      <BarPanel
        title="TECHNOLOGY DISTRIBUTION"
        icon={Cpu}
        iconColor={COLORS.cyan}
        data={results.technologyDistribution}
        barColor={COLORS.cyan}
      />
    </div>
  );
}

export default memo(Charts);
