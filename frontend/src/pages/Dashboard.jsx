import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Loader2, LayoutDashboard, Network, Server, Lock, Cpu, ShieldAlert, Bug, FileText,
} from "lucide-react";
import { COLORS, STATUS, MODULE_STATUS } from "../constants/theme.js";
import { useAnalysis } from "../hooks/useAnalysis.jsx";
import { downloadReport } from "../services/api.js";
import Sidebar from "../components/layout/Sidebar.jsx";
import StatusDot from "../components/common/StatusDot.jsx";
import ProgressBar from "../components/common/ProgressBar.jsx";
import DownloadMenu from "../components/common/DownloadMenu.jsx";
import Tabs from "../components/common/Tabs.jsx";
import Terminal from "../components/dashboard/Terminal.jsx";
import ModuleStatusList from "../components/dashboard/ModuleStatusList.jsx";
import RecentLogs from "../components/dashboard/RecentLogs.jsx";
import RiskMeter from "../components/dashboard/RiskMeter.jsx";
import TargetInfo from "../components/dashboard/TargetInfo.jsx";
import Charts from "../components/dashboard/Charts.jsx";
import PortsTable from "../components/dashboard/PortsTable.jsx";
import DnsPanel from "../components/dashboard/DnsPanel.jsx";
import SslPanel from "../components/dashboard/SslPanel.jsx";
import VulnerabilityScannerPanel from "../components/dashboard/VulnerabilityScannerPanel.jsx";
import WhoisPanel from "../components/dashboard/WhoisPanel.jsx";
import TechnologyPanel from "../components/dashboard/TechnologyPanel.jsx";
import SecurityFindings from "../components/dashboard/SecurityFindings.jsx";
import Recommendations from "../components/dashboard/Recommendations.jsx";
import StatsRow from "../components/dashboard/StatsRow.jsx";
import ScanDetailsPanel from "../components/dashboard/ScanDetailsPanel.jsx";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ports", label: "Ports", icon: Network },
  { id: "vulnerabilities", label: "Vulnerabilities", icon: Bug },
  { id: "dns", label: "DNS", icon: Server },
  { id: "ssl", label: "SSL", icon: Lock },
  { id: "whois", label: "WHOIS", icon: FileText },
  { id: "tech", label: "Technologies", icon: Cpu },
  { id: "findings", label: "Findings", icon: ShieldAlert },
];

export default function Dashboard() {
  const { target, selectedModules, status, logs, moduleStatuses, results, error, startAnalysis, isRunning, isComplete } =
    useAnalysis();
  const navigate = useNavigate();
  const [downloadState, setDownloadState] = useState({ loading: false, error: null });
  const [activeTab, setActiveTab] = useState("overview");

  // Guard against landing here directly (e.g. bookmark/refresh) with no active or completed scan.
  useEffect(() => {
    if (status === STATUS.IDLE) navigate("/", { replace: true });
  }, [status, navigate]);

  const overallProgress = useMemo(() => {
    const total = selectedModules.length;
    if (total === 0) return 0;
    const settled = selectedModules.filter(
      (id) => moduleStatuses[id] === MODULE_STATUS.DONE || moduleStatuses[id] === MODULE_STATUS.FAILED
    ).length;
    return (settled / total) * 100;
  }, [selectedModules, moduleStatuses]);

  const tabCounts = useMemo(
    () => ({
      ports: results?.ports?.length ?? 0,
      dns: (results?.dnsRecordCounts ?? []).reduce((sum, d) => sum + d.count, 0),
      tech: results?.technologies?.length ?? 0,
      findings: results?.findings?.length ?? 0,
    }),
    [results]
  );

  if (status === STATUS.IDLE) return null;

  const handleDownloadReport = async (format = "pdf") => {
    if (!results?.scanId) return;
    setDownloadState({ loading: true, error: null });
    try {
      await downloadReport(results.scanId, target, format);
      setDownloadState({ loading: false, error: null });
    } catch (err) {
      setDownloadState({ loading: false, error: err.message });
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 min-w-0 relative">
        <div className="absolute inset-0 cs-grid-bg opacity-[0.15] pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold text-white m-0">Security Operations Center</h1>
              <p className="font-mono text-xs text-white/35 mt-1 truncate max-w-[70vw]">
                target: <span style={{ color: COLORS.cyan }}>{target}</span> · modules: {selectedModules.length} active
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isComplete && results?.scanId && (
                <DownloadMenu onSelect={handleDownloadReport} loading={downloadState.loading} />
              )}
              <div
                className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border"
                style={{
                  borderColor: isComplete ? "rgba(0,255,136,0.35)" : status === STATUS.ERROR ? "rgba(255,77,79,0.35)" : "rgba(255,184,0,0.35)",
                  background: isComplete ? "rgba(0,255,136,0.06)" : status === STATUS.ERROR ? "rgba(255,77,79,0.06)" : "rgba(255,184,0,0.06)",
                }}
                role="status"
              >
                <StatusDot color={isComplete ? COLORS.green : status === STATUS.ERROR ? COLORS.red : COLORS.orange} size={7} />
                <span style={{ color: isComplete ? COLORS.green : status === STATUS.ERROR ? COLORS.red : COLORS.orange }}>
                  {isComplete ? "SCAN COMPLETE" : status === STATUS.ERROR ? "SCAN FAILED" : "SCANNING"}
                </span>
              </div>
            </div>
          </div>

          {status === STATUS.ERROR && error && (
            <div className="cs-glass rounded-xl p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,77,79,0.4)" }} role="alert">
              <AlertTriangle size={18} color={COLORS.red} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/85 m-0 font-medium">Scan failed</p>
                <p className="text-xs text-white/50 mt-1 m-0 break-words">{error.message}</p>
              </div>
              <button
                onClick={() => startAnalysis()}
                className="shrink-0 font-mono text-xs px-3 py-1.5 rounded-lg border focus-ring"
                style={{ borderColor: `${COLORS.red}55`, color: COLORS.red }}
              >
                Retry
              </button>
            </div>
          )}

          {downloadState.error && (
            <div className="cs-glass rounded-xl p-3 text-xs" style={{ color: COLORS.red }} role="alert">
              {downloadState.error}
            </div>
          )}

          {!isComplete && status !== STATUS.ERROR && (
            <ProgressBar value={overallProgress} color={COLORS.orange} label="Overall scan progress" />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <Terminal target={target} logs={logs} running={isRunning} />
            </div>
            <div className="space-y-5">
              <RiskMeter score={results?.riskScore ?? 0} severityCounts={results?.severityCounts} />
              <ModuleStatusList selectedModules={selectedModules} moduleStatuses={moduleStatuses} />
              {!results && <RecentLogs logs={logs} />}
            </div>
          </div>

          <AnimatePresence>
            {results && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-10">
                <Tabs tabs={TABS.map((t) => ({ ...t, count: tabCounts[t.id] }))} active={activeTab} onChange={setActiveTab} />

                <div className="mt-5">
                  {activeTab === "overview" && (
                    <div className="space-y-5">
                      <StatsRow results={results} />
                      <Charts results={results} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <TargetInfo target={target} info={results.targetInfo} />
                        <ScanDetailsPanel target={target} targetInfo={results.targetInfo} scanMeta={results.scanMeta} />
                      </div>
                      <Recommendations recommendations={results.recommendations} />
                    </div>
                  )}

                  {activeTab === "ports" && <PortsTable ports={results.ports} summary={results.portsSummary} />}

                  {activeTab === "vulnerabilities" && (
                    <VulnerabilityScannerPanel vulnerability={results.vulnerability} error={results.errors?.vulnerability_scanner} />
                  )}

                  {activeTab === "dns" && <DnsPanel dns={results.dns} />}

                  {activeTab === "ssl" && <SslPanel ssl={results.ssl} error={results.errors?.ssl_analyzer} />}

                  {activeTab === "whois" && <WhoisPanel whois={results.whois} error={results.errors?.whois_lookup} />}

                  {activeTab === "tech" && (
                    <TechnologyPanel technologies={results.technologies} error={results.errors?.technology_fingerprint} />
                  )}

                  {activeTab === "findings" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <SecurityFindings findings={results.findings} />
                      <Recommendations recommendations={results.recommendations} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
