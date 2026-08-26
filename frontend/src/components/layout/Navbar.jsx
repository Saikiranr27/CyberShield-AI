import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Bell, Github, Settings, User } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import StatusDot from "../common/StatusDot.jsx";
import Logo from "../common/Logo.jsx";
import { useBackendHealth } from "../../hooks/useBackendHealth.js";

const STATUS_META = {
  checking: { color: COLORS.orange, label: "CONNECTING" },
  online: { color: COLORS.green, label: "ONLINE" },
  offline: { color: COLORS.red, label: "OFFLINE" },
};

function Navbar() {
  const health = useBackendHealth();
  const meta = STATUS_META[health];

  return (
    <header className="cs-glass sticky top-0 z-40 border-b" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="CyberSentinel AI home">
          <Logo />
        </Link>

        <div
          className="hidden md:flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border transition-colors duration-300"
          style={{ borderColor: `${meta.color}55`, background: `${meta.color}0f` }}
          role="status"
          aria-label={`Backend status: ${meta.label.toLowerCase()}`}
          title={health === "offline" ? "Could not reach the Flask backend. Is it running?" : undefined}
        >
          <StatusDot color={meta.color} size={7} />
          <span style={{ color: meta.color }}>BACKEND</span>
          <span className="text-white/70" aria-hidden="true">●</span>
          <span style={{ color: meta.color }} className={health === "checking" ? "cs-blink" : undefined}>
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4 text-white/70">
          <button className="relative hover:text-cyan-300 transition-colors focus-ring rounded" aria-label="Notifications">
            <Bell size={18} />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }}
              aria-hidden="true"
            />
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex hover:text-cyan-300 transition-colors focus-ring rounded"
            aria-label="View source on GitHub"
          >
            <Github size={18} />
          </a>
          <Link to="/settings" className="hover:text-cyan-300 transition-colors focus-ring rounded" aria-label="Settings">
            <Settings size={18} />
          </Link>
          <button
            className="flex items-center gap-2 pl-3 border-l border-white/10 hover:text-cyan-300 transition-colors focus-ring rounded"
            aria-label="User profile: analyst_01"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,229,255,0.1)", border: `1px solid ${COLORS.cyan}66` }}
              aria-hidden="true"
            >
              <User size={14} color={COLORS.cyan} />
            </div>
            <span className="hidden lg:inline font-mono text-xs text-white/60">analyst_01</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default memo(Navbar);
