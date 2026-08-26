import { MODULES } from "../constants/modules.js";

/**
 * Local mock scan simulation — used only when VITE_MOCK_MODE=true, for UI
 * development without a running Flask backend. Off by default; the app
 * talks to the real backend (see services/api.js) otherwise.
 *
 * Returns data already in the *adapted* shape (the same shape
 * `services/adapter.js` produces from a real scan), since there's no real
 * per-module backend payload to adapt here.
 */

export const MOCK_LOG_STEPS = [
  "Starting Scan...",
  "Resolving Target...",
  "Running Port Scan...",
  "Found 4 Open Ports",
  "Running Vulnerability Scanner...",
  "Checking SSL...",
  "Checking DNS...",
  "Running WHOIS...",
  "Fingerprinting Technologies...",
  "Calculating Risk...",
  "Generating Report...",
  "Scan Complete",
];

function mockFinding(id, severity, title, description, module, moduleLabel, recommendation, score) {
  return { id, severity, title, description, module, module_label: moduleLabel, recommendation, score };
}

export function buildMockAdaptedResult(scanId, target, moduleIds) {
  const ports = [
    { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 8.9", state: "open", reason: "syn-ack", risk: "medium" },
    { port: 80, protocol: "tcp", service: "http", version: "nginx 1.18.0", state: "open", reason: "syn-ack", risk: "low" },
    { port: 443, protocol: "tcp", service: "https", version: "nginx 1.18.0", state: "open", reason: "syn-ack", risk: "low" },
    { port: 3306, protocol: "tcp", service: "mysql", version: "", state: "open", reason: "syn-ack", risk: "high" },
    { port: 21, protocol: "tcp", service: "ftp", version: "", state: "filtered", reason: "no-response", risk: "none" },
    { port: 25, protocol: "tcp", service: "smtp", version: "", state: "closed", reason: "conn-refused", risk: "none" },
  ];

  const findings = [
    mockFinding("mock-1", "high", "Exposed sensitive port 3306 (mysql)", "Port 3306 (mysql) is open and reachable.", "port_scanner", "Port Scanner", "Restrict public access to port 3306.", 7.5),
    mockFinding("mock-2", "medium", "Missing header: Content-Security-Policy", "Restricts sources of executable/loaded content.", "vulnerability_scanner", "Vulnerability Scanner", "Add the Content-Security-Policy response header.", 5.0),
    mockFinding("mock-3", "medium", "Missing header: Strict-Transport-Security", "Enforces HTTPS connections.", "vulnerability_scanner", "Vulnerability Scanner", "Add the Strict-Transport-Security response header.", 5.0),
    mockFinding("mock-4", "low", "Server banner disclosed", "Server header discloses 'nginx/1.18.0'.", "vulnerability_scanner", "Vulnerability Scanner", "Suppress or generalize the Server header.", 2.5),
  ];

  const severityCounts = { critical: 0, high: 1, medium: 2, low: 1 };

  return {
    scanId,
    target,
    timestamp: new Date().toISOString(),
    modules: moduleIds.map((id) => id.replace(/-/g, "_")),
    riskScore: 27,

    targetInfo: {
      hostname: target,
      ipAddress: "203.0.113.42",
      ipv6Address: null,
      reverseDns: `mock-host.${target}`,
      operatingSystem: "Linux 5.x (mock, 89% confidence)",
      country: "United States",
      region: "California",
      city: "San Francisco",
      isp: "Mock ISP LLC",
      org: "Mock Org",
      asn: "AS00000 Mock Networks",
      live: true,
      httpStatus: 200,
      httpsAvailable: true,
      serverBanner: "nginx/1.18.0",
      responseTimeMs: 84,
    },

    technologies: [
      { name: "Nginx", category: "Web Server", version: "1.18.0", evidence: "HTTP response headers" },
      { name: "PHP", category: "Language / Runtime", version: "8.1", evidence: "HTTP response headers" },
      { name: "Cloudflare", category: "CDN / Security", version: null, evidence: "HTTP response headers" },
    ],

    ports,
    portsSummary: {
      engine: "mock", resolvedIp: "203.0.113.42", totalScanned: ports.length, scanDurationMs: 420,
      stateCounts: { open: 4, closed: 1, filtered: 1 },
      osDetection: { name: "Linux 5.x", accuracy: 89, family: "Linux" },
    },
    portStateDistribution: [
      { name: "Open", count: 4 },
      { name: "Closed", count: 1 },
      { name: "Filtered", count: 1 },
    ],
    portServiceDistribution: [
      { name: "Web", count: 2 },
      { name: "Database", count: 1 },
      { name: "Remote Access", count: 1 },
      { name: "Mail", count: 0 },
      { name: "DNS", count: 0 },
      { name: "Other", count: 0 },
    ],
    portRiskDistribution: { critical: 0, high: 1, medium: 1, low: 2 },

    dns: {
      A: [{ value: "203.0.113.42", ttl: 300 }],
      AAAA: [],
      MX: [{ value: "10 mail.example.com", ttl: 3600 }],
      TXT: [{ value: "v=spf1 -all", ttl: 3600 }],
      NS: [{ value: "ns1.example.com", ttl: 86400 }, { value: "ns2.example.com", ttl: 86400 }],
      CNAME: [],
      SOA: [{ value: "mname=ns1.example.com rname=admin.example.com serial=2026071700", ttl: 3600 }],
      PTR: [{ value: `mock-host.${target}`, ttl: 300, for_ip: "203.0.113.42" }],
    },
    dnsRecordCounts: [
      { type: "A", count: 1 }, { type: "AAAA", count: 0 }, { type: "MX", count: 1 },
      { type: "TXT", count: 1 }, { type: "NS", count: 2 }, { type: "CNAME", count: 0 },
      { type: "SOA", count: 1 }, { type: "PTR", count: 1 },
    ],
    dnsPrimaryIp: "203.0.113.42",

    ssl: {
      issuer: "CN=Mock CA, O=Mock Certificate Authority",
      subject: `CN=${target}`,
      valid_from: new Date(Date.now() - 30 * 86400000).toISOString(),
      expiry_date: new Date(Date.now() + 60 * 86400000).toISOString(),
      days_remaining: 60,
      tls_version: "TLSv1.3",
      cipher: { name: "TLS_AES_256_GCM_SHA384", protocol: "TLSv1.3", bits: 256 },
      validity_status: "valid",
      subject_alt_names: [target, `www.${target}`],
      public_key: { algorithm: "RSA", key_size: 2048 },
      signature_algorithm: "sha256",
      serial_number: "0a1b2c3d4e5f",
      certificate_chain: [
        { subject: `CN=${target}`, issuer: "CN=Mock Intermediate CA" },
        { subject: "CN=Mock Intermediate CA", issuer: "CN=Mock Root CA" },
      ],
      security_grade: { grade: "A", reason: "TLS 1.3 negotiated with a modern AEAD cipher." },
    },

    vulnerability: {
      final_url: `https://${target}/`,
      status_code: 200,
      server_banner: "nginx/1.18.0",
      response_time_ms: 84,
      headers: { Server: "nginx/1.18.0", "Content-Type": "text/html" },
      security_headers_present: { "X-Content-Type-Options": "nosniff" },
      missing_security_headers: [
        { header: "Content-Security-Policy", description: "Restricts sources of executable/loaded content.", risk: "high" },
        { header: "Strict-Transport-Security", description: "Enforces HTTPS connections.", risk: "high" },
      ],
      cookies: [{ name: "session_id", secure: true, http_only: true, same_site: "Lax", domain: target, expires: null }],
      redirect_chain: [],
      https_available: true,
      scheme_used: "https",
      dangerous_methods: { tested_via: "OPTIONS", allowed_methods: ["GET", "HEAD", "POST"], dangerous_methods: [] },
      directory_exposure: [],
      misconfigurations: [],
    },

    whois: {
      registrar: "Mock Registrar Inc.",
      creation_date: new Date(Date.now() - 3000 * 86400000).toISOString(),
      expiration_date: new Date(Date.now() + 300 * 86400000).toISOString(),
      updated_date: new Date(Date.now() - 120 * 86400000).toISOString(),
      domain_status: ["clientTransferProhibited"],
      registrant_country: "US",
      name_servers: ["ns1.example.com", "ns2.example.com"],
    },

    findings,
    severityCounts,
    recommendations: [
      { title: "Restrict public access to port 3306.", detail: "Exposed sensitive port 3306 (mysql)", severity: "high" },
      { title: "Add the Content-Security-Policy response header.", detail: "Missing header: Content-Security-Policy", severity: "medium" },
    ],

    raw: {},
    errors: {},
  };
}

/** Build a per-module timing plan so the mock UI shows realistic, staggered completion. */
export function buildModulePlan(moduleIds) {
  return moduleIds.map((id) => {
    const meta = MODULES.find((m) => m.id === id);
    return {
      id,
      label: meta?.label ?? id,
      durationMs: 500 + Math.round(Math.random() * 700),
    };
  });
}
