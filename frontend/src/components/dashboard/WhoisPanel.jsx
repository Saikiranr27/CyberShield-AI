import React, { memo } from "react";
import { FileText } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] py-1.5">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="font-mono text-white/80 text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

function WhoisPanel({ whois, error }) {
  if (error) {
    return (
      <Panel title="WHOIS" icon={FileText} iconColor={COLORS.red}>
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.red }}>
          {error}
        </p>
      </Panel>
    );
  }

  if (!whois) {
    return (
      <Panel title="WHOIS" icon={FileText} iconColor={COLORS.cyan}>
        <p className="text-[12px] text-white/30 py-6 text-center">WHOIS Lookup was not run for this scan.</p>
      </Panel>
    );
  }

  return (
    <Panel title="WHOIS" icon={FileText} iconColor={COLORS.blue}>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <Row label="Registrar" value={whois.registrar} />
        <Row label="Creation Date" value={whois.creation_date} />
        <Row label="Expiration Date" value={whois.expiration_date} />
        <Row label="Updated Date" value={whois.updated_date} />
        <Row
          label="Domain Age"
          value={
            typeof whois.domain_age_days === "number"
              ? `${whois.domain_age_days} days (~${(whois.domain_age_days / 365).toFixed(1)} yrs)`
              : null
          }
        />
        <Row label="Registrant Country" value={whois.registrant_country} />
      </div>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] text-white/35 mb-2 font-mono tracking-widest">DOMAIN STATUS</div>
        {whois.domain_status?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {whois.domain_status.map((s) => (
              <span key={s} className="px-2 py-1 rounded-md text-[10.5px] font-mono text-white/60 bg-white/[0.04] border border-white/[0.06] break-all">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-white/25">Not available.</p>
        )}
      </div>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] text-white/35 mb-2 font-mono tracking-widest">NAME SERVERS</div>
        {whois.name_servers?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {whois.name_servers.map((ns) => (
              <span key={ns} className="px-2 py-1 rounded-md text-[11px] font-mono text-white/60 bg-white/[0.04] border border-white/[0.06]">
                {ns}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-white/25">Not available.</p>
        )}
      </div>

      {!whois.registrant_country && (
        <p className="mt-3 text-[10.5px] text-white/25 italic">
          Registrant details are frequently redacted by registrars (GDPR/privacy proxies) — not fabricated when absent.
        </p>
      )}
    </Panel>
  );
}

export default memo(WhoisPanel);
