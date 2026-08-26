import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { COLORS } from "./constants/theme.js";
import { AnalysisProvider } from "./hooks/useAnalysis.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import LoadingSpinner from "./components/common/LoadingSpinner.jsx";

// Route-level code splitting keeps the initial bundle small — the dashboard's
// chart library and the landing page's canvas animation don't need to load together.
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  return (
    <ThemeProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="min-h-screen w-full text-white overflow-x-hidden font-body" style={{ background: COLORS.bg }}>
            <Navbar />
            <main id="main-content">
              <Suspense fallback={<LoadingSpinner label="Loading module..." fullScreen />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </BrowserRouter>
      </AnalysisProvider>
    </ThemeProvider>
  );
}
