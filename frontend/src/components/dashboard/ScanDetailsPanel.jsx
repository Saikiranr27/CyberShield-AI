import React, { memo } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { formatTimestamp } from "../../utils/helpers.js";
import Panel from "../common/Panel.jsx";
import CopyButton from "../common/CopyButton.jsx";

function Row({ label, value, mono = true }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] py-1.5">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono" : ""} text-white/80`}>{value ?? "—"}</span>
    </div>
  );
}

function ScanDetailsPanel({ target, targetInfo, scanMeta }) {
  const meta = scanMeta ?? {};

  return (
    <Panel title="SCAN DETAILS" icon={TerminalIcon} iconColor={COLORS.cyan}>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <Row label="Target" value={target} />
        <Row label="Hostname" value={targetInfo?.hostname} />
        <Row label="IP Address" value={targetInfo?.ipAddress} />
        <Row label="Scan Start Time" value={meta.startedAt ? formatTimestamp(meta.startedAt) : null} />
        <Row label="Scan End Time" value={meta.endedAt ? formatTimestamp(meta.endedAt) : null} />
        <Row label="Duration" value={meta.durationMs != null ? `${(meta.durationMs / 1000).toFixed(2)}s` : null} />
        <Row label="Scanner Version" value={meta.scannerVersion} />
      </div>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-white/35 font-mono tracking-widest">COMMAND USED</div>
          {meta.commandUsed && <CopyButton value={meta.commandUsed} label="Copy command" />}
        </div>
        <code className="block text-[11px] font-mono text-white/60 bg-white/[0.03] border rounded-lg p-2.5 break-all" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {meta.commandUsed || "N/A — Port Scanner not run, or the socket-fallback engine was used (nmap unavailable)."}
        </code>
      </div>
    </Panel>
  );
}

export default memo(ScanDetailsPanel);
