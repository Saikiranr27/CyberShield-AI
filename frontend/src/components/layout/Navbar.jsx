import React, { memo, useEffect, useRef, useState } from "react";
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const notifications = health === "offline"
    ? [{ id: "backend-offline", title: "Backend unavailable", detail: "The Flask API did not respond to the latest health check." }]
    : [];

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationsOpen]);

  return (
    <header className="cs-glass sticky top-0 z-40 border-b" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-y-2">
        <Link to="/" aria-label="CyberSentinel AI home">
          <Logo size="text-lg sm:text-xl" />
        </Link>

        <div
          className="order-3 md:order-none basis-full md:basis-auto flex items-center justify-center md:justify-start gap-2 font-mono text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-full border transition-colors duration-300"
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
          <div className="relative" ref={notificationRef}>
            <button
              className="relative hover:text-cyan-300 transition-colors focus-ring rounded"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="notification-panel"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={18} />
              {notifications.length > 0 && <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }}
                aria-hidden="true"
              />}
            </button>
            {notificationsOpen && (
              <div id="notification-panel" role="dialog" aria-label="Notifications" className="absolute right-0 top-9 z-50 w-[min(19rem,calc(100vw-1.5rem))] cs-glass border border-cyan-400/20 rounded-lg p-3 shadow-2xl">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="font-mono text-xs text-white/80 m-0">NOTIFICATIONS</h2>
                  <span className="font-mono text-[10px] text-white/35">{notifications.length}</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="font-mono text-[11px] text-white/40 m-0 py-3">No new notifications.</p>
                ) : notifications.map((notification) => (
                  <div key={notification.id} className="border-t border-white/10 pt-2">
                    <p className="font-mono text-[11px] text-white/75 m-0">{notification.title}</p>
                    <p className="text-xs text-white/45 mt-1 mb-0">{notification.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
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
