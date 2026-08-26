import React, { memo } from "react";
import { Globe, MapPin, Server, Clock, Wifi, ArrowLeftRight } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";
import Badge from "../common/Badge.jsx";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1">
      <span className="text-white/40">{label}</span>
      <span className="font-mono text-white/80 text-right truncate max-w-[60%]">{value ?? "—"}</span>
    </div>
  );
}

function TargetInfo({ target, info }) {
  const geo = [info?.city, info?.region, info?.country].filter(Boolean).join(", ");

  return (
    <Panel title="TARGET INFORMATION" icon={Globe} iconColor={COLORS.cyan}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-mono text-cyan-300 truncate">{info?.hostname ?? target ?? "—"}</div>
        {info?.live != null && <Badge color={info.live ? COLORS.green : COLORS.red}>{info.live ? "LIVE" : "UNREACHABLE"}</Badge>}
      </div>

      <div className="space-y-0.5">
        <Row label="Primary IP" value={info?.ipAddress} />
        <Row label="IPv6 Address" value={info?.ipv6Address} />
        <Row label="Operating System" value={info?.operatingSystem ?? "Not detected (requires root privileges)"} />
        <Row label="Reverse DNS" value={info?.reverseDns} />
        <Row label="Location" value={geo || null} />
        <Row label="ASN" value={info?.asn} />
        <Row label="ISP / Org" value={info?.isp ?? info?.org} />
        <Row label="HTTP Status" value={info?.httpStatus} />
        <Row label="HTTPS Support" value={info?.httpsAvailable == null ? null : info.httpsAvailable ? "Yes" : "No"} />
        <Row label="Server Banner" value={info?.serverBanner} />
        <Row label="Response Time" value={info?.responseTimeMs != null ? `${info.responseTimeMs} ms` : null} />
      </div>

      {(!info?.country || !info?.isp) && (
        <p className="mt-3 pt-3 border-t text-[10.5px] text-white/25 italic" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          Geolocation fields require outbound access to the IP geolocation API; unavailable fields are not fabricated.
        </p>
      )}
    </Panel>
  );
}

export default memo(TargetInfo);
