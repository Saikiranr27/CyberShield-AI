/**
 * Adapts the Flask backend's raw scan response into the shape the dashboard
 * components render. As of the backend's `utils/analysis.py` addition,
 * findings/recommendations/risk score are computed server-side from real
 * module data — this file no longer re-derives them, it just flattens and
 * renames backend keys into frontend-friendly ones. No values are invented;
 * anything the backend didn't return stays null/empty and the UI shows
 * "not available" rather than a fabricated placeholder.
 */

const PORT_SERVICE_CATEGORIES = [
  { name: "Web", ports: [80, 443, 8080, 8443] },
  { name: "Database", ports: [1433, 3306, 5432, 6379, 9200, 27017] },
  { name: "Remote Access", ports: [22, 23, 3389] },
  { name: "Mail", ports: [25, 110, 143, 465, 587, 993, 995] },
  { name: "DNS", ports: [53] },
];

function categorizeByService(ports) {
  const counts = Object.fromEntries(PORT_SERVICE_CATEGORIES.map((c) => [c.name, 0]));
  counts.Other = 0;
  for (const p of ports) {
    if (p.state !== "open") continue;
    const category = PORT_SERVICE_CATEGORIES.find((c) => c.ports.includes(p.port));
    counts[category ? category.name : "Other"] += 1;
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

function categorizeByRisk(ports) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const p of ports) {
    if (p.state !== "open") continue;
    if (counts[p.risk] !== undefined) counts[p.risk] += 1;
  }
  return counts;
}

function categorizeByTechCategory(technologies) {
  const counts = {};
  for (const t of technologies) {
    const cat = t.category || "Other";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

function dnsValue(record) {
  return record && typeof record === "object" ? record.value : record;
}

/**
 * @param {object} scan - the full ScanRecord dict from the backend:
 *   { scan_id, target, timestamp, modules, results, risk_score, target_info, findings, recommendations }
 */
export function adaptScanToFrontend(scan) {
  const results = scan.results ?? {};

  const port = results.port_scanner ?? null;
  const vulnerability = results.vulnerability_scanner ?? null;
  const ssl = results.ssl_analyzer ?? null;
  const dns = results.dns_lookup ?? null;
  const whois = results.whois_lookup ?? null;
  const tech = results.technology_fingerprint ?? null;

  const allPorts = port && !port.error ? port.ports ?? port.open_ports ?? [] : [];
  const portsSummary =
    port && !port.error
      ? {
          engine: port.engine,
          resolvedIp: port.resolved_ip,
          totalScanned: port.total_scanned,
          scanDurationMs: port.scan_duration_ms,
          stateCounts: port.state_counts,
          osDetection: port.os_detection ?? null,
        }
      : null;

  const technologies = tech && !tech.error ? tech.technologies ?? [] : [];

  const findings = scan.findings ?? [];
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (severityCounts[f.severity] !== undefined) severityCounts[f.severity] += 1;
  }

  const errors = Object.fromEntries(
    Object.entries(results)
      .filter(([, v]) => v && v.error)
      .map(([k, v]) => [k, v.error])
  );

  const info = scan.target_info ?? {};

  return {
    scanId: scan.scan_id,
    target: scan.target,
    timestamp: scan.timestamp,
    modules: scan.modules ?? [],
    riskScore: scan.risk_score ?? 0,

    targetInfo: {
      hostname: info.hostname ?? scan.target,
      ipAddress: info.ip_address ?? null,
      ipv6Address: info.ipv6_address ?? null,
      reverseDns: info.reverse_dns ?? null,
      operatingSystem: info.operating_system ?? null,
      country: info.country ?? null,
      region: info.region ?? null,
      city: info.city ?? null,
      isp: info.isp ?? null,
      org: info.org ?? null,
      asn: info.asn ?? null,
      live: info.live ?? null,
      httpStatus: info.http_status ?? null,
      httpsAvailable: info.https_available ?? null,
      serverBanner: info.server_banner ?? null,
      responseTimeMs: info.response_time_ms ?? null,
    },

    technologies,
    technologyDistribution: categorizeByTechCategory(technologies),

    ports: allPorts,
    portsSummary,
    portStateDistribution: portsSummary
      ? [
          { name: "Open", count: portsSummary.stateCounts?.open ?? 0 },
          { name: "Closed", count: portsSummary.stateCounts?.closed ?? 0 },
          { name: "Filtered", count: portsSummary.stateCounts?.filtered ?? 0 },
        ]
      : [],
    portServiceDistribution: categorizeByService(allPorts),
    portRiskDistribution: categorizeByRisk(allPorts),

    dns: dns && !dns.error ? dns : null,
    dnsRecordCounts:
      dns && !dns.error
        ? ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "PTR"].map((type) => ({
            type,
            count: (dns[type] ?? []).length,
          }))
        : [],
    dnsPrimaryIp: dns && !dns.error ? dnsValue(dns.A?.[0]) : null,

    ssl,
    vulnerability,
    whois,
    technology: tech,

    findings,
    severityCounts,
    recommendations: scan.recommendations ?? [],

    scanMeta: scan.scan_meta
      ? {
          startedAt: scan.scan_meta.started_at ?? null,
          endedAt: scan.scan_meta.ended_at ?? null,
          durationMs: scan.scan_meta.duration_ms ?? null,
          scannerVersion: scan.scan_meta.scanner_version ?? null,
          commandUsed: scan.scan_meta.command_used ?? null,
        }
      : null,

    raw: results,
    errors,
  };
}
