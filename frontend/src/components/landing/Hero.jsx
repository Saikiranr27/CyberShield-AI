import React from "react";
import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import CircuitBackground from "./CircuitBackground.jsx";
import BootSequence from "./BootSequence.jsx";

export default function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: "78vh" }} aria-labelledby="hero-heading">
      <div className="absolute inset-0 cs-grid-bg opacity-60" aria-hidden="true" />
      <div className="absolute inset-0">
        <CircuitBackground />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 30%, transparent 0%, ${COLORS.bg} 78%)` }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <div
          className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full font-mono text-[11px] tracking-[0.2em]"
          style={{ border: `1px solid ${COLORS.cyan}44`, color: COLORS.cyan, background: "rgba(0,229,255,0.05)" }}
        >
          <Fingerprint size={13} aria-hidden="true" /> OFFENSIVE SECURITY · AUTOMATED RECON · AI TRIAGE
        </div>

        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-display font-black tracking-wider text-[13vw] leading-none sm:text-6xl md:text-7xl"
          style={{ color: "#fff" }}
        >
          CYBER<span style={{ color: COLORS.cyan }} className="cs-glow-text">SENTINEL</span>{" "}
          <span style={{ color: COLORS.blue }}>AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-4 text-lg md:text-xl text-white/60 tracking-wide"
        >
          AI-Powered Offensive Security Platform
        </motion.p>

        <div className="mt-6">
          <BootSequence />
        </div>
      </div>
    </section>
  );
}
