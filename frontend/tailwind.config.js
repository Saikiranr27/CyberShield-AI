/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cs: {
          bg: "#090D13",
          panel: "#111827",
          cyan: "#00E5FF",
          blue: "#00BFFF",
          green: "#00FF88",
          orange: "#FFB800",
          red: "#FF4D4F",
        },
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "cs-grid-move": "cs-grid-move 14s linear infinite",
        "cs-blink": "cs-blink 1.6s step-end infinite",
        "cs-caret": "cs-caret 0.9s step-end infinite",
        "cs-scanline": "cs-scanline 5s linear infinite",
        "cs-pulse-ring": "cs-pulse-ring 2s ease-out infinite",
        "cs-float": "cs-float 4s ease-in-out infinite",
        "cs-shimmer": "cs-shimmer 2.4s infinite",
      },
      keyframes: {
        "cs-grid-move": {
          "0%": { backgroundPosition: "0 0, 0 0" },
          "100%": { backgroundPosition: "42px 42px, 42px 42px" },
        },
        "cs-blink": {
          "0%, 45%": { opacity: 1 },
          "50%, 100%": { opacity: 0.15 },
        },
        "cs-caret": {
          "0%, 50%": { opacity: 1 },
          "51%, 100%": { opacity: 0 },
        },
        "cs-scanline": {
          "0%": { transform: "translateY(-100%)", opacity: 0 },
          "10%": { opacity: 1 },
          "90%": { opacity: 1 },
          "100%": { transform: "translateY(2200%)", opacity: 0 },
        },
        "cs-pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(0,229,255,0.35)" },
          "100%": { boxShadow: "0 0 0 14px rgba(0,229,255,0)" },
        },
        "cs-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "cs-shimmer": {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
