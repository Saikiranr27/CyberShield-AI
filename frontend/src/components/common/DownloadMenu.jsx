import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Braces, Table2, Loader2 } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

const FORMATS = [
  { id: "pdf", label: "PDF Report", icon: FileText },
  { id: "json", label: "JSON", icon: Braces },
  { id: "csv", label: "CSV", icon: Table2 },
];

/** A small "Download ▾" button that opens a PDF/JSON/CSV format picker. */
export default function DownloadMenu({ onSelect, loading, label = "Report" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border transition-colors focus-ring disabled:opacity-50"
        style={{ borderColor: `${COLORS.cyan}55`, color: COLORS.cyan, background: `${COLORS.cyan}0d` }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        {label}
        <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-lg border cs-glass z-20 overflow-hidden"
          style={{ borderColor: "rgba(0,229,255,0.2)" }}
        >
          {FORMATS.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(f.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-mono text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <f.icon size={13} className="text-white/40" />
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
