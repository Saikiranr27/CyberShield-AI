import React, { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { riskColor, formatTimestamp } from "../utils/helpers.js";
import { getHistory, downloadReport } from "../services/api.js";
import Sidebar from "../components/layout/Sidebar.jsx";
import Panel from "../components/common/Panel.jsx";
import { SkeletonRow } from "../components/common/Skeleton.jsx";
import DownloadMenu from "../components/common/DownloadMenu.jsx";

export default function Reports() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getHistory({ skipCache: true });
      setHistory(records);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (entry, format) => {
    setDownloadingId(entry.id);
    try {
      await downloadReport(entry.id, entry.target, format);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
        <div className="absolute inset-0 cs-grid-bg opacity-[0.15] pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold text-white m-0">Scan Reports</h1>
              <p className="font-mono text-xs text-white/35 mt-1">Scan history retrieved from the CyberSentinel backend.</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border transition-colors focus-ring disabled:opacity-50"
              style={{ borderColor: `${COLORS.cyan}55`, color: COLORS.cyan }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <Panel title="REPORT HISTORY" icon={FileText} iconColor={COLORS.cyan}>
            {loading ? (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-[13px]" style={{ color: COLORS.red }} role="alert">
                  {error}
                </p>
                <button
                  onClick={load}
                  className="font-mono text-xs px-3 py-1.5 rounded-lg border focus-ring"
                  style={{ borderColor: `${COLORS.red}55`, color: COLORS.red }}
                >
                  Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <p className="text-[13px] text-white/40 py-6 text-center">
                No completed scans yet. Run an analysis from the landing page to see it here.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-white/85 truncate m-0">{entry.target}</p>
                      <p className="font-mono text-[11px] text-white/35 mt-0.5 m-0">
                        {formatTimestamp(entry.date)} · {entry.moduleCount} modules
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="font-display font-bold text-sm px-2.5 py-1 rounded-md"
                        style={{ color: riskColor(entry.riskScore), background: `${riskColor(entry.riskScore)}18` }}
                      >
                        {entry.riskScore}
                      </span>
                      <DownloadMenu
                        label=""
                        loading={downloadingId === entry.id}
                        onSelect={(format) => handleDownload(entry, format)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}
