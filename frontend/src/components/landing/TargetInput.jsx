import React, { useId, useState } from "react";
import { Globe, Crosshair } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function TargetInput({ value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="max-w-3xl mx-auto px-6 -mt-6 relative z-10">
      <label htmlFor={inputId} className="flex items-center gap-2 mb-3 font-mono text-xs tracking-widest text-white/40">
        <Crosshair size={13} style={{ color: COLORS.cyan }} aria-hidden="true" /> TARGET ACQUISITION
      </label>
      <div
        className="relative rounded-xl cs-glass transition-all duration-300"
        style={{
          boxShadow: focused
            ? `0 0 0 1px ${COLORS.cyan}88, 0 0 30px ${COLORS.cyan}33`
            : error
            ? `0 0 0 1px ${COLORS.red}88`
            : `0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        <Globe
          className="absolute left-4 top-1/2 -translate-y-1/2"
          size={18}
          color={focused ? COLORS.cyan : "#5b6779"}
          aria-hidden="true"
        />
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="https://example.com  or  192.168.1.10"
          className="font-mono w-full bg-transparent outline-none pl-12 pr-4 py-4 text-sm md:text-base text-white placeholder:text-white/25"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {focused && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" aria-hidden="true">
            <div
              className="w-full h-px cs-scanline"
              style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)` }}
            />
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-xs font-mono" style={{ color: COLORS.red }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
