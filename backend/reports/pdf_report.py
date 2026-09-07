"""
PDF report generation for completed scans.

Builds a professional, print-friendly report (cover page, executive summary,
target info, per-module findings, risk score, recommendations) using
reportlab's Platypus layout engine.
"""

from __future__ import annotations

from html import escape
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from utils.helpers import risk_label
from utils.logger import get_logger

logger = get_logger("reports.pdf_report")

_BRAND_CYAN = colors.HexColor("#0891B2")
_BRAND_DARK = colors.HexColor("#0F172A")
_RISK_HEX = {
    "Critical": "#DC2626",
    "High": "#EA580C",
    "Medium": "#2563EB",
    "Low": "#16A34A",
}
_RISK_COLORS = {label: colors.HexColor(hex_value) for label, hex_value in _RISK_HEX.items()}

_MODULE_TITLES = {
    "port_scanner": "Port Scanner",
    "vulnerability_scanner": "Vulnerability Scanner",
    "ssl_analyzer": "SSL Analyzer",
    "dns_lookup": "DNS Lookup",
    "whois_lookup": "WHOIS Lookup",
    "technology_fingerprint": "Technology Fingerprinting",
}


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle", parent=base["Title"], fontSize=26, textColor=_BRAND_DARK, spaceAfter=6
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle", parent=base["Normal"], fontSize=13, textColor=_BRAND_CYAN,
            alignment=TA_CENTER, spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "ReportMeta", parent=base["Normal"], fontSize=10, textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
        ),
        "h2": ParagraphStyle(
            "SectionHeading", parent=base["Heading2"], fontSize=15, textColor=_BRAND_DARK,
            spaceBefore=18, spaceAfter=8, borderPadding=0,
        ),
        "h3": ParagraphStyle(
            "SubHeading", parent=base["Heading3"], fontSize=12, textColor=_BRAND_CYAN, spaceBefore=10, spaceAfter=4
        ),
        "body": ParagraphStyle("Body", parent=base["Normal"], fontSize=10, leading=14),
        "small": ParagraphStyle("Small", parent=base["Normal"], fontSize=8, textColor=colors.HexColor("#64748B")),
    }


def _table(rows: list[list[Any]], col_widths: list[float] | None = None) -> Table:
    cell_style = ParagraphStyle(
        "TableCell", fontName="Helvetica", fontSize=8.5, leading=10.5,
        textColor=colors.HexColor("#0F172A"), wordWrap="CJK",
    )
    header_style = ParagraphStyle(
        "TableHeader", parent=cell_style, fontName="Helvetica-Bold", textColor=colors.white,
    )
    wrapped_rows = []
    for row_index, row in enumerate(rows):
        style = header_style if row_index == 0 else cell_style
        wrapped_rows.append([
            value if isinstance(value, Paragraph) else Paragraph(escape(str(value if value is not None else "")), style)
            for value in row
        ])
    table = Table(wrapped_rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1, splitByRow=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _BRAND_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _severity_color_hex(severity: str) -> str:
    return {"critical": "#DC2626", "high": "#EA580C", "medium": "#2563EB", "low": "#16A34A"}.get(severity, "#334155")


def _render_module_section(story: list, styles: dict, module_id: str, data: Any) -> None:
    title = _MODULE_TITLES.get(module_id, module_id.replace("_", " ").title())
    story.append(Paragraph(title, styles["h3"]))

    if not isinstance(data, dict):
        story.append(Paragraph(str(data), styles["body"]))
        return

    if data.get("error"):
        story.append(Paragraph(f"<font color='#DC2626'>Error: {data['error']}</font>", styles["body"]))
        return

    if module_id == "port_scanner":
        os_info = data.get("os_detection")
        os_text = f"{os_info['name']} ({os_info.get('accuracy', '?')}% confidence)" if os_info else "Not detected (requires root privileges)"
        story.append(Paragraph(
            f"Engine: {data.get('engine', 'N/A')} &nbsp;|&nbsp; Resolved IP: {data.get('resolved_ip') or 'N/A'} "
            f"&nbsp;|&nbsp; Scan duration: {data.get('scan_duration_ms', 'N/A')} ms",
            styles["body"],
        ))
        story.append(Paragraph(f"OS Detection: {os_text}", styles["body"]))
        counts = data.get("state_counts", {})
        story.append(Paragraph(
            f"Total scanned: {data.get('total_scanned', 'N/A')} &nbsp;|&nbsp; "
            f"Open: {counts.get('open', 0)} &nbsp;|&nbsp; Closed: {counts.get('closed', 0)} &nbsp;|&nbsp; "
            f"Filtered: {counts.get('filtered', 0)}",
            styles["body"],
        ))
        story.append(Spacer(1, 4))
        rows = [["Port", "Service", "State", "Product", "Version", "Risk"]]
        for p in data.get("ports", data.get("open_ports", [])) or []:
            rows.append([
                str(p.get("port")), p.get("service", ""), p.get("state", ""),
                p.get("product") or "-", p.get("version") or "-", p.get("risk", "-"),
            ])
        if len(rows) == 1:
            rows.append(["-", "-", "-", "-", "-", "-"])
        story.append(_table(rows, [40, 70, 55, 90, 90, 45]))

    elif module_id == "vulnerability_scanner":
        story.append(Paragraph(f"Final URL: {data.get('final_url', 'N/A')}", styles["body"]))
        story.append(Paragraph(
            f"Status Code: {data.get('status_code', 'N/A')} &nbsp;|&nbsp; Server: {data.get('server_banner', 'N/A')} "
            f"&nbsp;|&nbsp; Response Time: {data.get('response_time_ms', 'N/A')} ms",
            styles["body"],
        ))
        story.append(Paragraph(f"HTTPS Available: {data.get('https_available')}", styles["body"]))
        missing = data.get("missing_security_headers") or []
        if missing:
            rows = [["Missing Header", "Risk", "Purpose"]] + [[m["header"], m.get("risk", "-"), m["description"]] for m in missing]
            story.append(Spacer(1, 4))
            story.append(_table(rows, [130, 45, 210]))
        else:
            story.append(Paragraph("All common security headers are present.", styles["body"]))

        cookies = data.get("cookies") or []
        if cookies:
            story.append(Spacer(1, 4))
            rows = [["Cookie", "Secure", "HttpOnly", "SameSite"]] + [
                [c["name"], str(c.get("secure")), str(c.get("http_only")), c.get("same_site") or "-"] for c in cookies
            ]
            story.append(_table(rows, [140, 60, 70, 115]))

        dangerous = (data.get("dangerous_methods") or {}).get("dangerous_methods") or []
        allowed = (data.get("dangerous_methods") or {}).get("allowed_methods") or []
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            f"HTTP Methods Allowed: {', '.join(allowed) or 'N/A'}"
            + (f" — <font color='#DC2626'>dangerous: {', '.join(dangerous)}</font>" if dangerous else ""),
            styles["body"],
        ))

        exposures = data.get("directory_exposure") or []
        if exposures:
            story.append(Spacer(1, 4))
            rows = [["Exposed Path", "Status", "Risk"]] + [[e["path"], str(e["status_code"]), e.get("risk", "-")] for e in exposures]
            story.append(_table(rows, [200, 80, 95]))
        else:
            story.append(Paragraph("No sensitive paths from the checked list were exposed.", styles["body"]))

        misconfigs = data.get("misconfigurations") or []
        if misconfigs:
            story.append(Spacer(1, 4))
            for m in misconfigs:
                story.append(Paragraph(f"&bull; <b>{m['title']}</b>: {m['description']}", styles["body"]))

    elif module_id == "ssl_analyzer":
        cipher = data.get("cipher") or {}
        pubkey = data.get("public_key") or {}
        grade = data.get("security_grade") or {}
        rows = [
            ["Field", "Value"],
            ["Issuer", data.get("issuer", "N/A")],
            ["Subject", data.get("subject", "N/A")],
            ["Expiry Date", data.get("expiry_date", "N/A")],
            ["Days Remaining", str(data.get("days_remaining", "N/A"))],
            ["TLS Version", data.get("tls_version", "N/A")],
            ["Weak TLS", str(data.get("weak_tls"))],
            ["Cipher", f"{cipher.get('name', 'N/A')} ({cipher.get('bits', 'N/A')} bits)"],
            ["Weak Cipher", str(data.get("weak_cipher"))],
            ["Public Key", f"{pubkey.get('algorithm', 'N/A')} ({pubkey.get('key_size', 'N/A')} bits)" if pubkey else "N/A"],
            ["Signature Algorithm", data.get("signature_algorithm") or "N/A"],
            ["Validity Status", data.get("validity_status", "N/A")],
            ["Security Grade", f"{grade.get('grade', 'N/A')} — {grade.get('reason', '')}"],
        ]
        story.append(_table(rows, [140, 245]))
        sans = data.get("subject_alt_names") or []
        if sans:
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Subject Alternative Names: {', '.join(sans[:15])}{' ...' if len(sans) > 15 else ''}", styles["body"]))
        chain = data.get("certificate_chain") or []
        if chain:
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Certificate Chain ({len(chain)} certificate(s)):", styles["body"]))
            rows = [["#", "Subject", "Issuer"]] + [[str(i + 1), c.get("subject", "-"), c.get("issuer", "-")] for i, c in enumerate(chain)]
            story.append(_table(rows, [25, 190, 190]))

    elif module_id == "dns_lookup":
        rows = [["Record Type", "Value", "TTL"]]
        for rtype in ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "PTR"]:
            records = data.get(rtype) or []
            if not records:
                rows.append([rtype, "-", "-"])
            for rec in records:
                value = rec.get("value", "-") if isinstance(rec, dict) else str(rec)
                ttl = rec.get("ttl", "-") if isinstance(rec, dict) else "-"
                rows.append([rtype, value, str(ttl) if ttl is not None else "-"])
        story.append(_table(rows, [70, 285, 40]))

    elif module_id == "whois_lookup":
        age = data.get("domain_age_days")
        age_text = f"{age} days (~{age / 365:.1f} years)" if isinstance(age, int) else "N/A"
        rows = [
            ["Field", "Value"],
            ["Registrar", data.get("registrar") or "N/A"],
            ["Creation Date", data.get("creation_date") or "N/A"],
            ["Domain Age", age_text],
            ["Expiration Date", data.get("expiration_date") or "N/A"],
            ["Updated Date", data.get("updated_date") or "N/A"],
            ["Domain Status", ", ".join(data.get("domain_status") or []) or "N/A"],
            ["Registrant Country", data.get("registrant_country") or "N/A (often redacted)"],
            ["Name Servers", ", ".join(data.get("name_servers") or []) or "N/A"],
        ]
        story.append(_table(rows, [140, 245]))

    elif module_id == "technology_fingerprint":
        techs = data.get("technologies") or []
        if techs:
            rows = [["Technology", "Category", "Version", "Evidence"]] + [
                [t["name"], t["category"], t.get("version") or "-", t["evidence"]] for t in techs
            ]
            story.append(_table(rows, [95, 95, 55, 140]))
        else:
            story.append(Paragraph("No specific technologies identified.", styles["body"]))

    else:
        story.append(Paragraph(str(data), styles["body"]))

    story.append(Spacer(1, 6))


def generate_pdf_report(scan: dict[str, Any], output_path: str) -> str:
    """
    Render `scan` (the same shape as ScanRecord.to_full_dict()) to a PDF at
    `output_path`. Returns output_path on success; raises on failure so the
    API layer can translate it into a clean JSON error.
    """
    styles = _styles()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.9 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title=f"CyberSentinel AI Report - {scan.get('target', 'unknown')}",
    )

    risk_score = int(scan.get("risk_score", 0))
    label = risk_label(risk_score)
    risk_color = _RISK_COLORS.get(label, _BRAND_DARK)

    story: list = []

    # --- Cover page ---------------------------------------------------------
    story.append(Spacer(1, 1.6 * inch))
    story.append(Paragraph("CyberSentinel AI", styles["title"]))
    story.append(Paragraph("AI-Powered Offensive Security Platform", styles["subtitle"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", color=_BRAND_CYAN, thickness=1.2))
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph("Security Assessment Report", styles["h2"]))
    story.append(Paragraph(f"Target: <b>{scan.get('target', 'N/A')}</b>", styles["body"]))
    story.append(Paragraph(f"Scan ID: {scan.get('scan_id', 'N/A')}", styles["body"]))
    story.append(Paragraph(f"Generated: {scan.get('timestamp', 'N/A')}", styles["body"]))
    story.append(Spacer(1, 0.25 * inch))

    risk_table = _table([["Overall Risk Score", "Risk Level"], [f"{risk_score} / 100", label]])
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _BRAND_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 12),
                ("TEXTCOLOR", (1, 1), (1, 1), risk_color),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(risk_table)
    story.append(PageBreak())

    # --- Executive summary --------------------------------------------------
    story.append(Paragraph("Executive Summary", styles["h2"]))
    modules_run = scan.get("modules", [])
    module_labels = ", ".join(_MODULE_TITLES.get(m, m) for m in modules_run) or "None"
    summary_text = (
        f"CyberSentinel AI performed an automated security assessment of "
        f"<b>{scan.get('target', 'the target')}</b> using {len(modules_run)} module(s): {module_labels}. "
        f"The assessment produced an overall risk score of <b>{risk_score}/100</b> "
        f"(<font color='{_RISK_HEX.get(label, '#000000')}'>{label}</font>). "
        "Detailed findings and recommendations for each module are provided below."
    )
    story.append(Paragraph(summary_text, styles["body"]))
    story.append(Spacer(1, 10))

    # --- Target Information ---------------------------------------------------
    info = scan.get("target_info") or {}
    if info:
        story.append(Paragraph("Target Information", styles["h2"]))
        rows = [
            ["Field", "Value"],
            ["Hostname", info.get("hostname") or "N/A"],
            ["Primary IP", info.get("ip_address") or "N/A"],
            ["IPv6 Address", info.get("ipv6_address") or "N/A"],
            ["Operating System", info.get("operating_system") or "Not detected (requires root privileges)"],
            ["Reverse DNS", info.get("reverse_dns") or "N/A"],
            ["Country / Region / City", ", ".join(filter(None, [info.get("country"), info.get("region"), info.get("city")])) or "N/A"],
            ["ISP / Organization", info.get("isp") or info.get("org") or "N/A"],
            ["ASN", info.get("asn") or "N/A"],
            ["Live", str(info.get("live"))],
            ["HTTP Status", str(info.get("http_status") or "N/A")],
            ["HTTPS Available", str(info.get("https_available"))],
            ["Server Banner", info.get("server_banner") or "N/A"],
            ["Response Time", f"{info.get('response_time_ms')} ms" if info.get("response_time_ms") is not None else "N/A"],
        ]
        story.append(_table(rows, [160, 225]))
        story.append(Spacer(1, 10))

    # --- Scan Details ---------------------------------------------------------
    meta = scan.get("scan_meta") or {}
    if meta:
        story.append(Paragraph("Scan Details", styles["h2"]))
        rows = [
            ["Field", "Value"],
            ["Target", scan.get("target", "N/A")],
            ["Scan Start Time", meta.get("started_at") or "N/A"],
            ["Scan End Time", meta.get("ended_at") or "N/A"],
            ["Duration", f"{meta.get('duration_ms')} ms" if meta.get("duration_ms") is not None else "N/A"],
            ["Scanner Version", meta.get("scanner_version") or "N/A"],
            ["Command Used", meta.get("command_used") or "N/A (Port Scanner not run, or socket-fallback engine used)"],
        ]
        story.append(_table(rows, [160, 225]))
        story.append(Spacer(1, 10))

    # --- Recommendations ------------------------------------------------------
    story.append(Paragraph("Recommendations", styles["h2"]))
    recommendations = scan.get("recommendations") or []
    for rec in recommendations:
        color = _severity_color_hex(rec.get("severity", "low"))
        story.append(Paragraph(
            f"&bull; <font color='{color}'>[{rec.get('severity', '').upper()}]</font> {rec.get('title', '')}"
            + (f" — {rec.get('detail')}" if rec.get("detail") else ""),
            styles["body"],
        ))
    story.append(Spacer(1, 10))

    # --- Findings (grouped by severity) -----------------------------------------
    story.append(Paragraph("Findings", styles["h2"]))
    findings = scan.get("findings") or []
    if not findings:
        story.append(Paragraph("No findings were raised by the modules run.", styles["body"]))
    else:
        rows = [["Severity", "Title", "Module", "CVSS", "CWE", "OWASP", "Recommendation"]]
        for f in findings:
            rows.append([
                f.get("severity", "").upper(),
                f.get("title", ""),
                f.get("module_label", f.get("module", "")),
                f"{f.get('cvss', f.get('score', 0)):.1f}",
                f.get("cwe") or "-",
                f.get("owasp") or "-",
                f.get("recommendation", ""),
            ])
        story.append(_table(rows, [45, 100, 75, 30, 45, 45, 95]))
    story.append(Spacer(1, 6))

    # --- Per-module details --------------------------------------------------
    story.append(Paragraph("Detailed Module Results", styles["h2"]))
    results = scan.get("results", {}) or {}
    if not results:
        story.append(Paragraph("No module results were recorded for this scan.", styles["body"]))
    for module_id in modules_run:
        _render_module_section(story, styles, module_id, results.get(module_id))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#CBD5E1"), thickness=0.75))
    story.append(Paragraph(
        "Generated by CyberSentinel AI. For authorized security testing only. "
        "This report is informational and does not constitute a certified penetration test.",
        styles["small"],
    ))

    try:
        doc.build(story)
    except Exception:
        logger.exception("Failed to render PDF report for scan %s", scan.get("scan_id"))
        raise

    return output_path
