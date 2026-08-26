import React, { memo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, ScanLine, FileText, Settings, X, Menu } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import StatusDot from "../common/StatusDot.jsx";
import { useAnalysis } from "../../hooks/useAnalysis.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarLink({ to, label, icon: Icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all duration-200 relative focus-ring ${
          isActive ? "text-cyan-300" : "text-white/50 hover:text-white/80"
        }`
      }
      style={({ isActive }) => ({
        background: isActive ? "rgba(0,229,255,0.08)" : "transparent",
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
              style={{ background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}` }}
              aria-hidden="true"
            />
          )}
          <Icon size={16} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resetAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const handleNewScan = () => {
    resetAnalysis();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <>
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center cs-glass cs-glow-border"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={18} color={COLORS.cyan} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-16 left-0 z-50 lg:z-10 h-[calc(100vh-64px)] w-60 shrink-0 cs-glass border-r flex flex-col py-6
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-300`}
        style={{ borderColor: "rgba(0,229,255,0.1)" }}
        aria-label="Dashboard navigation"
      >
        <button
          className="lg:hidden absolute top-3 right-3 text-white/50 focus-ring rounded"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={handleNewScan}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all duration-200 text-white/50 hover:text-white/80 focus-ring"
          >
            <ScanLine size={16} aria-hidden="true" />
            New Scan
          </button>
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="px-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 text-[11px] font-mono text-white/30">
            <StatusDot color={COLORS.green} size={6} />
            AI ENGINE v4.2.1
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);
