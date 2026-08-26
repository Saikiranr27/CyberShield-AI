import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { COLORS } from "../../constants/theme.js";

export default function StartButton({ disabled, onClick, hint }) {
  return (
    <div className="flex flex-col items-center mt-12 pb-24">
      <motion.button
        type="button"
        whileHover={!disabled ? { scale: 1.03 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        disabled={disabled}
        onClick={onClick}
        className="font-display relative px-12 py-4 rounded-xl font-bold tracking-[0.15em] text-sm md:text-base transition-all duration-300 disabled:cursor-not-allowed focus-ring"
        style={{
          background: !disabled ? `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.blue})` : "rgba(255,255,255,0.05)",
          color: !disabled ? "#04121a" : "#5b6779",
          boxShadow: !disabled ? `0 0 40px ${COLORS.cyan}55` : "none",
        }}
      >
        <span className="flex items-center gap-2">
          <Zap size={16} aria-hidden="true" /> START ANALYSIS
        </span>
      </motion.button>
      {disabled && hint && (
        <p className="mt-3 text-xs text-white/30 font-mono" role="note">
          {hint}
        </p>
      )}
    </div>
  );
}
