import React from "react";
import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { COLORS } from "../constants/theme.js";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <ShieldOff size={40} color={COLORS.red} aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold text-white mt-4">404 — Target Not Found</h1>
      <p className="font-mono text-sm text-white/40 mt-2">The route you requested doesn't exist in this system.</p>
      <Link
        to="/"
        className="mt-6 px-6 py-3 rounded-lg font-display text-sm font-bold tracking-wide focus-ring"
        style={{ background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.blue})`, color: "#04121a" }}
      >
        Return to Base
      </Link>
    </div>
  );
}
