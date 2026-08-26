import React from "react";
import { Settings as SettingsIcon, Palette, Accessibility, Server } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { apiConfig } from "../services/api.js";
import { useTheme } from "../hooks/useTheme.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import Panel from "../components/common/Panel.jsx";

const ACCENTS = [
  { id: "cyan", label: "Neon Cyan", color: COLORS.cyan },
  { id: "blue", label: "Electric Blue", color: COLORS.blue },
  { id: "green", label: "Status Green", color: COLORS.green },
];

export default function Settings() {
  const { accent, setAccent, reduceMotion, setReduceMotion } = useTheme();

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
        <div className="absolute inset-0 cs-grid-bg opacity-[0.15] pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-white m-0 flex items-center gap-2">
              <SettingsIcon size={20} style={{ color: COLORS.cyan }} aria-hidden="true" /> Settings
            </h1>
            <p className="font-mono text-xs text-white/35 mt-1">Preferences are stored locally in this browser.</p>
          </div>

          <Panel title="ACCENT COLOR" icon={Palette} iconColor={COLORS.blue}>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent color">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={accent === a.id}
                  onClick={() => setAccent(a.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-mono border transition-all focus-ring"
                  style={{
                    borderColor: accent === a.id ? a.color : "rgba(255,255,255,0.1)",
                    background: accent === a.id ? `${a.color}14` : "transparent",
                    color: accent === a.id ? a.color : "#8b96a8",
                  }}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} aria-hidden="true" />
                  {a.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="ACCESSIBILITY" icon={Accessibility} iconColor={COLORS.green}>
            <label className="flex items-center justify-between gap-4 text-[13px] text-white/70 cursor-pointer">
              <span>
                Reduce motion
                <span className="block text-[11px] text-white/35 mt-0.5">
                  Disables the particle background and non-essential animations.
                </span>
              </span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
            </label>
          </Panel>

          <Panel title="API CONFIGURATION" icon={Server} iconColor={COLORS.orange}>
            <dl className="space-y-2 text-[12px] font-mono">
              <div className="flex justify-between">
                <dt className="text-white/40">Base URL</dt>
                <dd className="text-white/75 m-0">{apiConfig.API_BASE}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Mode</dt>
                <dd className="m-0" style={{ color: apiConfig.MOCK_MODE ? COLORS.orange : COLORS.green }}>
                  {apiConfig.MOCK_MODE ? "Mock (no backend connected)" : "Live"}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-white/30 mt-3">
              Connect a real Flask backend by setting <code className="text-white/50">VITE_MOCK_MODE=false</code> and{" "}
              <code className="text-white/50">VITE_API_BASE_URL</code> in your environment.
            </p>
          </Panel>
        </div>
      </main>
    </div>
  );
}
