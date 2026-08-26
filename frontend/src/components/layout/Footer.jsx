import React, { memo } from "react";
import { COLORS } from "../../constants/theme.js";
import Logo from "../common/Logo.jsx";

function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="text-sm" />
        <p className="font-mono text-[11px] text-white/30 text-center">
          © {new Date().getFullYear()} CyberSentinel AI. For authorized security testing only.
        </p>
        <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: COLORS.green }}>
          <span aria-hidden="true">●</span> Threat intel feed connected
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);
