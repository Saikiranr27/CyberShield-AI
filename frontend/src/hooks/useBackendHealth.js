import { useEffect, useRef, useState } from "react";
import { apiConfig } from "../services/api.js";

const POLL_INTERVAL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 4_000;

/**
 * Polls the backend's GET /api/health endpoint so the UI can show real
 * connectivity status instead of a hardcoded "ONLINE" badge. Previously
 * nothing in the frontend called this endpoint even though the backend
 * exposed it — this hook closes that gap.
 */
export function useBackendHealth() {
  const [status, setStatus] = useState("checking"); // 'checking' | 'online' | 'offline'
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const check = async () => {
      if (apiConfig.MOCK_MODE) {
        if (mountedRef.current) setStatus("online");
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${apiConfig.API_BASE}/health`, { signal: controller.signal });
        if (mountedRef.current) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (mountedRef.current) setStatus("offline");
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
