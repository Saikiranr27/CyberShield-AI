"""
Reports API blueprint.

    GET /api/report/<scan_id>            - PDF report (default, unchanged from before)
    GET /api/report/<scan_id>?format=json - the full scan record as JSON
    GET /api/report/<scan_id>?format=csv  - ports + findings as CSV
"""

from __future__ import annotations

import csv
import io
import re
import uuid
from pathlib import Path
from typing import Any

from flask import Blueprint, Response, jsonify, request, send_file

from config import config
from database.database import db
from reports.pdf_report import generate_pdf_report
from utils.logger import get_logger

logger = get_logger("api.reports")

reports_bp = Blueprint("reports", __name__)

_UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


def _is_valid_scan_id(scan_id: str) -> bool:
    if not _UUID_RE.match(scan_id):
        return False
    try:
        uuid.UUID(scan_id)
        return True
    except ValueError:
        return False


def _build_csv(record_dict: dict[str, Any]) -> str:
    """A single CSV with section headers — ports, then findings, then recommendations."""
    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(["# CyberSentinel AI Report", record_dict.get("target"), record_dict.get("timestamp")])
    writer.writerow(["# Risk Score", record_dict.get("risk_score")])
    writer.writerow([])

    writer.writerow(["## PORTS"])
    writer.writerow(["Port", "Protocol", "State", "Service", "Product", "Version", "Risk", "Recommendation"])
    port_result = (record_dict.get("results") or {}).get("port_scanner") or {}
    for p in port_result.get("ports", port_result.get("open_ports", [])) or []:
        writer.writerow([
            p.get("port"), p.get("protocol"), p.get("state"), p.get("service"),
            p.get("product"), p.get("version"), p.get("risk"), p.get("recommendation"),
        ])
    writer.writerow([])

    writer.writerow(["## FINDINGS"])
    writer.writerow(["Severity", "Title", "Module", "CVSS", "CWE", "OWASP", "Description", "Recommendation", "Reference"])
    for f in record_dict.get("findings") or []:
        writer.writerow([
            f.get("severity"), f.get("title"), f.get("module_label"), f.get("cvss"),
            f.get("cwe"), f.get("owasp"), f.get("description"), f.get("recommendation"), f.get("reference"),
        ])
    writer.writerow([])

    writer.writerow(["## RECOMMENDATIONS"])
    writer.writerow(["Title", "Detail", "Severity"])
    for r in record_dict.get("recommendations") or []:
        writer.writerow([r.get("title"), r.get("detail"), r.get("severity")])

    return buf.getvalue()


@reports_bp.route("/api/report/<scan_id>", methods=["GET"])
def get_report(scan_id: str) -> Response | tuple[Response, int]:
    if not _is_valid_scan_id(scan_id):
        return jsonify({"status": "error", "message": "Invalid scan id format."}), 400

    record = db.get_scan(scan_id)
    if record is None:
        return jsonify({"status": "error", "message": f"No scan found with id '{scan_id}'."}), 404

    fmt = (request.args.get("format") or "pdf").lower()
    if fmt not in {"pdf", "json", "csv"}:
        return jsonify({"status": "error", "message": "format must be one of: pdf, json, csv."}), 400

    if fmt == "json":
        return jsonify({"status": "success", "scan_id": scan_id, "results": record.to_full_dict()}), 200

    if fmt == "csv":
        csv_body = _build_csv(record.to_full_dict())
        return Response(
            csv_body,
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cybersentinel-report-{scan_id}.csv"},
        )

    # fmt == "pdf" (default, unchanged behavior from before this endpoint supported ?format=)
    output_dir = Path(config.SCANS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{scan_id}.pdf"

    try:
        generate_pdf_report(record.to_full_dict(), str(output_path))
    except Exception:
        logger.exception("Failed to generate PDF report for scan %s", scan_id)
        return jsonify({"status": "error", "message": "Failed to generate the PDF report."}), 500

    return send_file(
        output_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"cybersentinel-report-{scan_id}.pdf",
    )
