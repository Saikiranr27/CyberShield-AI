"""
Centralized post-scan analysis: turns raw per-module results into
findings (diagnostic, grouped by severity), recommendations (actionable,
deduplicated), and a single 0-100 risk score.

This is the ONLY place this logic lives. Both api/scan.py (JSON response)
and reports/pdf_report.py (PDF report) call into this module, instead of
each re-implementing their own version of "what counts as a finding" —
which is what happened previously (duplicate logic between the frontend
adapter and the PDF generator). The frontend now just displays what this
module produces.

Every finding is derived from a real field in a real module's result.
Nothing here is fabricated, randomized, or guessed — if a module didn't
run or errored, it simply contributes no findings.

CWE/OWASP/CVSS: each finding is tagged with the standard CWE weakness ID
and OWASP Top 10 (2021) category that generically applies to that class of
issue, per MITRE/OWASP's own published mappings (see REFERENCE_BASE_URLS
below) — these are classification labels for the *type* of weakness, not a
target-specific calculated CVSS vector (which would require exploitability
metrics this tool doesn't attempt to derive). Where no standard mapping
meaningfully applies (e.g. a business-risk item like "domain expiring
soon"), CWE/OWASP are left null rather than forced.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

HIGH_RISK_PORTS_CRITICAL = {21, 23, 445}  # unauthenticated/legacy protocols with a long CVE history
HIGH_RISK_PORTS_HIGH = {1433, 3306, 3389, 5432, 6379, 9200}  # databases & remote administration

SEVERITY_SCORE = {"critical": 9.5, "high": 7.5, "medium": 5.0, "low": 2.5}
SEVERITY_RANK = {"critical": 3, "high": 2, "medium": 1, "low": 0}

# Exactly the 6 modules this build supports (see config.py's MODULE_NAME_MAP).
MODULE_LABELS = {
    "port_scanner": "Port Scanner",
    "vulnerability_scanner": "Vulnerability Scanner",
    "dns_lookup": "DNS Lookup",
    "whois_lookup": "WHOIS Lookup",
    "ssl_analyzer": "SSL Analyzer",
    "technology_fingerprint": "Technology Fingerprinting",
}

_CWE_URL = "https://cwe.mitre.org/data/definitions/{}.html"
_OWASP_URLS = {
    "A01:2021": "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
    "A02:2021": "https://owasp.org/Top10/A02_2021-Cryptographic_Failures/",
    "A03:2021": "https://owasp.org/Top10/A03_2021-Injection/",
    "A05:2021": "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
}

# Standard CWE + OWASP Top 10 (2021) classification per finding "kind" — see
# module docstring. Format: kind -> (cwe_id | None, owasp_category | None).
_TAXONOMY: dict[str, tuple[int | None, str | None]] = {
    "exposed_port": (284, "A01:2021"),  # Improper Access Control
    "https_unavailable": (319, "A02:2021"),  # Cleartext Transmission of Sensitive Information
    "missing_csp": (693, "A05:2021"),  # Protection Mechanism Failure
    "missing_hsts": (319, "A02:2021"),
    "missing_xfo": (1021, "A05:2021"),  # Improper Restriction of Rendered UI Layers (clickjacking)
    "missing_xcto": (693, "A05:2021"),
    "missing_referrer_policy": (200, "A05:2021"),  # Exposure of Sensitive Information
    "missing_permissions_policy": (693, "A05:2021"),
    "cookie_missing_secure": (614, "A05:2021"),  # Sensitive Cookie Without 'Secure' Attribute
    "cookie_missing_httponly": (1004, "A05:2021"),  # Sensitive Cookie Without 'HttpOnly' Flag
    "server_banner": (200, "A05:2021"),
    "dangerous_methods": (749, "A05:2021"),  # Exposed Dangerous Method or Function
    "directory_exposure": (538, "A05:2021"),  # Insertion of Sensitive Info into Externally-Accessible File
    "directory_listing": (548, "A05:2021"),  # Exposure of Information Through Directory Listing
  "permissive_cors": (942, "A05:2021"),  # Permissive Cross-domain Policy with Untrusted Domains
    "robots_disclosure": (200, "A05:2021"),
    "cert_expired": (298, "A02:2021"),  # Improper Validation of Certificate Expiration
    "cert_expiring": (298, "A02:2021"),
    "insecure_tls": (327, "A02:2021"),  # Use of a Broken or Risky Cryptographic Algorithm
    "weak_cipher": (326, "A02:2021"),  # Inadequate Encryption Strength
    "no_nameservers": (None, None),
    "domain_expiring": (None, None),
}


def _taxonomy(kind: str) -> dict[str, Any]:
    cwe_id, owasp = _TAXONOMY.get(kind, (None, None))
    return {
        "cwe": f"CWE-{cwe_id}" if cwe_id else None,
        "cwe_reference": _CWE_URL.format(cwe_id) if cwe_id else None,
        "owasp": owasp,
        "owasp_reference": _OWASP_URLS.get(owasp) if owasp else None,
    }


def _finding(
    module: str,
    severity: str,
    title: str,
    description: str,
    recommendation: str,
    kind: str = "",
    evidence: str | None = None,
) -> dict[str, Any]:
    tax = _taxonomy(kind)
    return {
        "id": f"{module}:{abs(hash((title, description))) % 100000:05x}",
        "module": module,
        "module_label": MODULE_LABELS.get(module, module),
        "severity": severity,
        "title": title,
        "description": description,
        "evidence": evidence,
        "recommendation": recommendation,
        "score": SEVERITY_SCORE[severity],
        "cvss": SEVERITY_SCORE[severity],
        "cwe": tax["cwe"],
        "owasp": tax["owasp"],
        "reference": tax["cwe_reference"] or tax["owasp_reference"],
    }


def _days_until(iso_date: str | None) -> int | None:
    if not iso_date:
        return None
    try:
        dt = datetime.fromisoformat(iso_date)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (dt - datetime.now(timezone.utc)).days
    except ValueError:
        return None


def build_findings(results: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []

    # --- Port Scanner --------------------------------------------------------
    port = results.get("port_scanner")
    if isinstance(port, dict) and not port.get("error"):
        for p in port.get("open_ports", []):
            if p.get("state") != "open":
                continue
            risk = p.get("risk")
            if risk not in ("critical", "high"):
                continue  # a generic open port (e.g. 80/443, risk="low"/"medium") isn't itself a finding
            port_num = p.get("port")
            findings.append(
                _finding(
                    "port_scanner",
                    risk,
                    f"Exposed sensitive port {port_num} ({p.get('service', 'unknown')})",
                    f"Port {port_num} ({p.get('service', 'unknown')}) is open and reachable from the network.",
                    f"Restrict public access to port {port_num} (firewall/security group) or disable the service if unused.",
                    kind="exposed_port",
                    evidence=f"port={port_num} state=open service={p.get('service', 'unknown')} banner={p.get('version') or 'n/a'}",
                )
            )

    # --- Vulnerability Scanner --------------------------------------------------
    vuln = results.get("vulnerability_scanner")
    if isinstance(vuln, dict) and not vuln.get("error"):
        if not vuln.get("https_available"):
            findings.append(
                _finding(
                    "vulnerability_scanner", "high", "HTTPS not available",
                    "The target does not support HTTPS; traffic can be intercepted or modified in transit.",
                    "Deploy a valid TLS certificate and redirect all HTTP traffic to HTTPS.",
                    kind="https_unavailable", evidence=f"scheme_used={vuln.get('scheme_used')}",
                )
            )
        _HEADER_KIND = {
            "Content-Security-Policy": "missing_csp",
            "Strict-Transport-Security": "missing_hsts",
            "X-Frame-Options": "missing_xfo",
            "X-Content-Type-Options": "missing_xcto",
            "Referrer-Policy": "missing_referrer_policy",
            "Permissions-Policy": "missing_permissions_policy",
        }
        for m in vuln.get("missing_security_headers", []):
            findings.append(
                _finding(
                    "vulnerability_scanner", m.get("risk", "medium"), f"Missing header: {m['header']}",
                    m.get("description", ""),
                    f"Add the {m['header']} response header.",
                    kind=_HEADER_KIND.get(m["header"], ""),
                    evidence=f"'{m['header']}' absent from response headers",
                )
            )
        for cookie in vuln.get("cookies", []):
            if vuln.get("https_available") and not cookie.get("secure"):
                findings.append(
                    _finding(
                        "vulnerability_scanner", "medium", f"Cookie '{cookie['name']}' missing Secure flag",
                        "This cookie can be transmitted over an unencrypted connection.",
                        f"Set the Secure attribute on the '{cookie['name']}' cookie.",
                        kind="cookie_missing_secure", evidence=f"Set-Cookie: {cookie['name']} (Secure not set)",
                    )
                )
            if not cookie.get("http_only"):
                findings.append(
                    _finding(
                        "vulnerability_scanner", "low", f"Cookie '{cookie['name']}' missing HttpOnly flag",
                        "This cookie is accessible to client-side JavaScript, widening XSS impact.",
                        f"Set the HttpOnly attribute on the '{cookie['name']}' cookie.",
                        kind="cookie_missing_httponly", evidence=f"Set-Cookie: {cookie['name']} (HttpOnly not set)",
                    )
                )
        banner = vuln.get("server_banner")
        if banner and banner != "Not disclosed":
            findings.append(
                _finding(
                    "vulnerability_scanner", "low", "Server banner disclosed",
                    f"The server discloses its software/version via the Server header: '{banner}'.",
                    "Suppress or generalize the Server header to reduce reconnaissance value for attackers.",
                    kind="server_banner", evidence=f"Server: {banner}",
                )
            )
        dangerous = (vuln.get("dangerous_methods") or {}).get("dangerous_methods") or []
        if dangerous:
            findings.append(
                _finding(
                    "vulnerability_scanner", "high", f"Dangerous HTTP method(s) allowed: {', '.join(dangerous)}",
                    "The server advertises support for HTTP methods that can enable file tampering, "
                    "cross-site tracing, or other abuse if not properly restricted.",
                    "Disable unused HTTP methods (PUT, DELETE, TRACE, CONNECT) at the web server or application layer.",
                    kind="dangerous_methods", evidence=f"Allow: {', '.join((vuln.get('dangerous_methods') or {}).get('allowed_methods') or [])}",
                )
            )
        for exposure in vuln.get("directory_exposure", []):
            findings.append(
                _finding(
                    "vulnerability_scanner", exposure.get("risk", "high"), f"Exposed sensitive path: {exposure['path']}",
                    f"A request to {exposure['path']} returned HTTP {exposure['status_code']}, "
                    "suggesting a sensitive file or directory is publicly accessible.",
                    f"Remove or restrict public access to {exposure['path']}.",
                    kind="directory_exposure", evidence=f"GET {exposure['path']} -> HTTP {exposure['status_code']}",
                )
            )
        for issue in vuln.get("misconfigurations", []):
            kind = "directory_listing" if "directory listing" in issue["title"].lower() else "permissive_cors"
            findings.append(
                _finding("vulnerability_scanner", issue.get("risk", "medium"), issue["title"], issue["description"],
                          f"Resolve: {issue['title']}.", kind=kind)
            )
        robots = vuln.get("robots_txt") or {}
        for path in robots.get("disclosed_sensitive_paths", []):
            findings.append(
                _finding(
                    "vulnerability_scanner", "low", f"robots.txt discloses sensitive path: {path}",
                    "robots.txt lists a path that hints at sensitive functionality (admin panels, backups, etc.) "
                    "to anyone who requests the file — search engines aren't the only ones who read it.",
                    "Avoid listing sensitive paths in robots.txt; restrict access to them directly instead.",
                    kind="robots_disclosure", evidence=f"Disallow: {path}",
                )
            )

    # --- SSL Analyzer ----------------------------------------------------------
    ssl_data = results.get("ssl_analyzer")
    if isinstance(ssl_data, dict) and not ssl_data.get("error"):
        if ssl_data.get("validity_status") == "expired":
            findings.append(
                _finding(
                    "ssl_analyzer", "critical", "TLS certificate expired",
                    f"The certificate expired on {ssl_data.get('expiry_date')}.",
                    "Renew the TLS certificate immediately.",
                    kind="cert_expired", evidence=f"notAfter={ssl_data.get('expiry_date')}",
                )
            )
        elif ssl_data.get("validity_status") == "expiring_soon":
            findings.append(
                _finding(
                    "ssl_analyzer", "medium", "TLS certificate expiring soon",
                    f"Only {ssl_data.get('days_remaining')} day(s) remain before expiry.",
                    "Renew the TLS certificate before it expires.",
                    kind="cert_expiring", evidence=f"days_remaining={ssl_data.get('days_remaining')}",
                )
            )
        if ssl_data.get("tls_version") in {"TLSv1", "TLSv1.1", "SSLv3", "SSLv2"}:
            findings.append(
                _finding(
                    "ssl_analyzer", "high", f"Insecure TLS protocol negotiated ({ssl_data.get('tls_version')})",
                    "Deprecated TLS/SSL protocol versions are vulnerable to known downgrade and decryption attacks.",
                    "Disable TLS 1.0/1.1 and SSLv3; require TLS 1.2 or newer.",
                    kind="insecure_tls", evidence=f"negotiated_protocol={ssl_data.get('tls_version')}",
                )
            )
        cipher_bits = (ssl_data.get("cipher") or {}).get("bits")
        if ssl_data.get("tls_version") not in {None, "unknown"} and cipher_bits is not None and cipher_bits < 128:
            findings.append(
                _finding(
                    "ssl_analyzer", "high", f"Weak cipher negotiated ({(ssl_data.get('cipher') or {}).get('name')})",
                    f"The negotiated cipher uses only {cipher_bits}-bit encryption, below the 128-bit modern minimum.",
                    "Disable weak ciphers in the server's TLS configuration; require 128-bit+ AEAD ciphers.",
                    kind="weak_cipher", evidence=f"cipher={(ssl_data.get('cipher') or {}).get('name')} bits={cipher_bits}",
                )
            )

    # --- DNS Lookup -----------------------------------------------------------
    dns = results.get("dns_lookup")
    if isinstance(dns, dict) and not dns.get("error"):
        if not dns.get("NS"):
            findings.append(
                _finding(
                    "dns_lookup", "low", "No authoritative name servers found",
                    "No NS records were returned for this domain.",
                    "Verify the domain's DNS delegation is configured correctly.",
                    kind="no_nameservers",
                )
            )

    # --- WHOIS Lookup -----------------------------------------------------------
    whois_data = results.get("whois_lookup")
    if isinstance(whois_data, dict) and not whois_data.get("error"):
        days_left = _days_until(whois_data.get("expiration_date"))
        if days_left is not None and days_left < 30:
            findings.append(
                _finding(
                    "whois_lookup", "high", "Domain registration expiring soon",
                    f"The domain's WHOIS registration expires in {days_left} day(s).",
                    "Renew the domain registration promptly to prevent expiry or hijacking.",
                    kind="domain_expiring", evidence=f"expiration_date={whois_data.get('expiration_date')}",
                )
            )

    findings.sort(key=lambda f: SEVERITY_RANK[f["severity"]], reverse=True)
    return findings


def build_recommendations(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deduplicate findings' recommendations into a prioritized action list."""
    grouped: dict[str, dict[str, Any]] = {}
    for f in findings:
        rec_text = f["recommendation"]
        if rec_text not in grouped:
            grouped[rec_text] = {"title": rec_text, "related": [], "severity": f["severity"]}
        grouped[rec_text]["related"].append(f["title"])
        if SEVERITY_RANK[f["severity"]] > SEVERITY_RANK[grouped[rec_text]["severity"]]:
            grouped[rec_text]["severity"] = f["severity"]

    recommendations = [
        {"title": g["title"], "detail": "; ".join(g["related"]), "severity": g["severity"]}
        for g in grouped.values()
    ]
    recommendations.sort(key=lambda r: SEVERITY_RANK[r["severity"]], reverse=True)

    if not recommendations:
        recommendations.append(
            {"title": "No high-priority issues detected", "detail": "Continue routine monitoring.", "severity": "low"}
        )
    return recommendations


def calculate_risk_score(findings: list[dict[str, Any]]) -> int:
    """0-100, the sum of each finding's CVSS-like score, capped at 100. Bands: see utils/helpers.risk_label."""
    return max(0, min(100, round(sum(f["score"] for f in findings))))
