import React, { memo } from "react";
import { Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import Panel from "../common/Panel.jsx";
import Badge from "../common/Badge.jsx";

const GRADE_COLOR = { "A+": COLORS.green, A: COLORS.green, B: COLORS.blue, C: COLORS.orange, D: COLORS.orange, F: COLORS.red };
const STATUS_META = {
  valid: { color: COLORS.green, label: "Valid" },
  expiring_soon: { color: COLORS.orange, label: "Expiring Soon" },
  expired: { color: COLORS.red, label: "Expired" },
};

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] py-1.5">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="font-mono text-white/80 text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

function WeakFlagRow({ label, isWeak }) {
  if (isWeak == null) return <Row label={label} value={null} />;
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] py-1.5">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="font-mono text-right" style={{ color: isWeak ? COLORS.red : COLORS.green }}>
        {isWeak ? "Yes" : "No"}
      </span>
    </div>
  );
}

function SslPanel({ ssl, error }) {
  if (error) {
    return (
      <Panel title="SSL / TLS" icon={ShieldAlert} iconColor={COLORS.red}>
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.red }}>
          {error}
        </p>
      </Panel>
    );
  }

  if (!ssl) {
    return (
      <Panel title="SSL / TLS" icon={Lock} iconColor={COLORS.cyan}>
        <p className="text-[12px] text-white/30 py-6 text-center">SSL Analyzer was not run for this scan.</p>
      </Panel>
    );
  }

  const status = STATUS_META[ssl.validity_status] ?? { color: "#8b96a8", label: ssl.validity_status ?? "Unknown" };
  const grade = ssl.security_grade?.grade;
  const gradeColor = GRADE_COLOR[grade] ?? "#8b96a8";

  return (
    <Panel title="SSL / TLS CERTIFICATE" icon={ShieldCheck} iconColor={COLORS.green}>
      <div className="flex items-center justify-between mb-3">
        <Badge color={status.color}>{status.label}</Badge>
        {grade && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-display font-bold text-sm"
            style={{ color: gradeColor, background: `${gradeColor}18` }}
            title={ssl.security_grade?.reason}
          >
            Grade {grade}
          </div>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <Row label="Issuer" value={ssl.issuer} />
        <Row label="Subject" value={ssl.subject} />
        <Row label="Valid From" value={ssl.valid_from} />
        <Row label="Expires" value={ssl.expiry_date} />
        <Row label="Days Remaining" value={ssl.days_remaining} />
        <Row label="TLS Version" value={ssl.tls_version} />
        <WeakFlagRow label="Weak TLS" isWeak={ssl.weak_tls} />
        <Row label="Cipher" value={ssl.cipher ? `${ssl.cipher.name} (${ssl.cipher.bits} bits)` : null} />
        <WeakFlagRow label="Weak Cipher" isWeak={ssl.weak_cipher} />
        <Row label="Public Key" value={ssl.public_key ? `${ssl.public_key.algorithm} (${ssl.public_key.key_size} bits)` : null} />
        <Row label="Signature Algorithm" value={ssl.signature_algorithm} />
        <Row label="Serial Number" value={ssl.serial_number} />
      </div>

      {ssl.subject_alt_names?.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="text-[11px] text-white/35 mb-2 font-mono tracking-widest">SUBJECT ALTERNATIVE NAMES</div>
          <div className="flex flex-wrap gap-1.5">
            {ssl.subject_alt_names.map((san) => (
              <span key={san} className="px-2 py-1 rounded-md text-[11px] font-mono text-white/60 bg-white/[0.04] border border-white/[0.06]">
                {san}
              </span>
            ))}
          </div>
        </div>
      )}

      {ssl.certificate_chain?.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="text-[11px] text-white/35 mb-2 font-mono tracking-widest">
            CERTIFICATE CHAIN ({ssl.certificate_chain.length})
          </div>
          <ol className="space-y-2">
            {ssl.certificate_chain.map((cert, i) => (
              <li key={i} className="text-[11px] font-mono border rounded-lg p-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-white/70 break-all">
                  <span className="text-white/35">Subject: </span>
                  {cert.subject}
                </div>
                <div className="text-white/50 break-all mt-0.5">
                  <span className="text-white/35">Issuer: </span>
                  {cert.issuer}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {ssl.security_grade?.reason && (
        <p className="mt-3 text-[11px] text-white/30 italic">Grade basis: {ssl.security_grade.reason}</p>
      )}
    </Panel>
  );
}

export default memo(SslPanel);
