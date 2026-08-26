import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { runScan } from "../services/api.js";
import { STATUS, MODULE_STATUS } from "../constants/theme.js";
import { DEFAULT_SELECTED_MODULES } from "../constants/modules.js";
import { isValidTarget } from "../utils/helpers.js";

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [target, setTarget] = useState("");
  const [selectedModules, setSelectedModules] = useState(DEFAULT_SELECTED_MODULES);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [logs, setLogs] = useState([]);
  const [moduleStatuses, setModuleStatuses] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const cancelRef = useRef(() => {});

  const toggleModule = useCallback((id) => {
    setSelectedModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }, []);

  const startAnalysis = useCallback(() => {
    if (!isValidTarget(target) || selectedModules.length === 0) {
      setError(new Error("Enter a valid target and select at least one module."));
      return false;
    }

    cancelRef.current();
    setError(null);
    setLogs([]);
    setResults(null);
    setStatus(STATUS.RUNNING);
    setModuleStatuses(
      Object.fromEntries(selectedModules.map((id) => [id, MODULE_STATUS.PENDING]))
    );

    cancelRef.current = runScan({
      target,
      modules: selectedModules,
      onLog: (entry) => setLogs((prev) => [...prev, entry]),
      onModuleUpdate: (id, moduleStatus) =>
        setModuleStatuses((prev) => ({
          ...prev,
          [id]:
            moduleStatus === "running"
              ? MODULE_STATUS.RUNNING
              : moduleStatus === "failed"
              ? MODULE_STATUS.FAILED
              : MODULE_STATUS.DONE,
        })),
      onComplete: (adapted) => {
        setResults(adapted);
        setStatus(STATUS.COMPLETE);
      },
      onError: (err) => {
        setError(err);
        setStatus(STATUS.ERROR);
      },
    });

    return true;
  }, [target, selectedModules]);

  const resetAnalysis = useCallback(() => {
    cancelRef.current();
    setStatus(STATUS.IDLE);
    setLogs([]);
    setModuleStatuses({});
    setResults(null);
    setError(null);
  }, []);

  // Cancel any in-flight scan on unmount (best-effort — see services/api.js).
  useEffect(() => () => cancelRef.current(), []);

  const value = useMemo(
    () => ({
      target,
      setTarget,
      selectedModules,
      toggleModule,
      status,
      logs,
      moduleStatuses,
      results,
      error,
      startAnalysis,
      resetAnalysis,
      isRunning: status === STATUS.RUNNING,
      isComplete: status === STATUS.COMPLETE,
    }),
    [target, selectedModules, toggleModule, status, logs, moduleStatuses, results, error, startAnalysis, resetAnalysis]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

/** Access shared scan state. Must be used within <AnalysisProvider>. */
export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within an AnalysisProvider");
  return ctx;
}
