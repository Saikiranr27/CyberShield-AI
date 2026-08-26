import React from "react";
import { Search, X } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function SearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-white/[0.03] border rounded-lg pl-8 pr-7 py-1.5 text-[12px] font-mono text-white/80 placeholder:text-white/25 outline-none transition-colors focus:border-cyan-400/50"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 focus-ring rounded"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
