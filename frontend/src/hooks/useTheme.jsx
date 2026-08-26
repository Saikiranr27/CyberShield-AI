import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "cybersentinel:theme-prefs";

const DEFAULT_PREFS = {
  accent: "cyan", // 'cyan' | 'blue' | 'green'
  reduceMotion: false,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

const ThemeContext = createContext(null);

/**
 * CyberSentinel AI is intentionally a single dark theme (the aesthetic IS
 * the product), so this hook doesn't do light/dark switching. It manages
 * the two preferences that are legitimately user-configurable: accent color
 * and reduced-motion, both applied as attributes on <html> so CSS/Tailwind
 * can react without prop-drilling.
 */
export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-accent", prefs.accent);
    root.setAttribute("data-reduce-motion", String(prefs.reduceMotion));
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setAccent = useCallback((accent) => setPrefs((p) => ({ ...p, accent })), []);
  const setReduceMotion = useCallback((reduceMotion) => setPrefs((p) => ({ ...p, reduceMotion })), []);

  const value = useMemo(() => ({ ...prefs, setAccent, setReduceMotion }), [prefs, setAccent, setReduceMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
