import { Network, Bug, Lock, Server, FileText, Cpu } from "lucide-react";

/**
 * The scan module catalog — kept in exact 1:1 correspondence with the
 * Flask backend's `config.MODULE_NAME_MAP` (see backend/config.py).
 * Exactly 6 modules, per spec.
 *
 * IMPORTANT: `label` is sent verbatim to `POST /api/scan` as the module
 * name the backend matches against (case-insensitively). Do not rename a
 * label here without updating MODULE_NAME_MAP on the backend to match.
 */
export const MODULES = Object.freeze([
  {
    id: "port-scanner",
    label: "Port Scanner",
    description: "TCP port discovery, service names, versions, and OS detection via nmap.",
    icon: Network,
  },
  {
    id: "vulnerability-scanner",
    label: "Vulnerability Scanner",
    description: "Headers, dangerous methods, cookies, directory exposure, misconfigurations.",
    icon: Bug,
  },
  {
    id: "dns-lookup",
    label: "DNS Lookup",
    description: "A, AAAA, MX, TXT, NS, CNAME, SOA, and PTR record resolution.",
    icon: Server,
  },
  {
    id: "whois-lookup",
    label: "WHOIS Lookup",
    description: "Registrar, dates, status, name servers, and registrant country.",
    icon: FileText,
  },
  {
    id: "ssl-analyzer",
    label: "SSL Analyzer",
    description: "Certificate, chain, cipher, TLS version, and heuristic security grade.",
    icon: Lock,
  },
  {
    id: "technology-fingerprinting",
    label: "Technology Fingerprinting",
    description: "Detects server software, CMS, and frontend frameworks in use.",
    icon: Cpu,
  },
]);

export const DEFAULT_SELECTED_MODULES = [
  "port-scanner",
  "vulnerability-scanner",
  "ssl-analyzer",
  "dns-lookup",
];

export const getModuleById = (id) => MODULES.find((m) => m.id === id);

/** Convert internal frontend module ids -> the exact labels the backend expects. */
export const idsToLabels = (ids) =>
  ids.map((id) => getModuleById(id)?.label).filter(Boolean);

/** Convert a backend internal module id (e.g. "port_scanner") back to its frontend id. */
const BACKEND_ID_TO_FRONTEND_ID = {
  port_scanner: "port-scanner",
  vulnerability_scanner: "vulnerability-scanner",
  dns_lookup: "dns-lookup",
  whois_lookup: "whois-lookup",
  ssl_analyzer: "ssl-analyzer",
  technology_fingerprint: "technology-fingerprinting",
};

export const backendIdToFrontendId = (backendId) => BACKEND_ID_TO_FRONTEND_ID[backendId] ?? backendId;
