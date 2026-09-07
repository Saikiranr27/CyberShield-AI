"""
Scan API blueprint.

    POST /api/scan               - run selected modules against a target
    GET  /api/results/<scan_id>  - fetch a previously completed scan
"""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from flask import Blueprint, Response, jsonify, request

from config import config
from database.database import db
from database.models import ScanRecord
from extensions import limiter
from modules import (
    dns_lookup,
    port_scanner,
    ssl_analyzer,
    target_info as target_info_module,
    technology_fingerprint,
    vulnerability_scanner,
    whois_lookup,
)
from utils.analysis import build_findings, build_recommendations, calculate_risk_score
from utils.helpers import (
    InvalidTargetError,
    fetch_with_fallback,
    generate_scan_id,
    normalize_module_names,
    now_iso,
    sanitize_target,
)
from utils.logger import get_logger

logger = get_logger("api.scan")

scan_bp = Blueprint("scan", __name__)

# All 6 modules are mutually independent (none needs another's *output*),
# so every requested module runs concurrently in a thread pool — these are
# I/O-bound calls (network sockets, DNS, TLS handshakes, HTTP requests) that
# release the GIL while waiting, so a thread pool gives a real wall-clock
# speedup, not just apparent concurrency.
#
# `cache` is a shared, lock-protected dict (never persisted) so Vulnerability
# Scanner and Technology Fingerprinting can share a single HTTP GET instead
# of each fetching the target independently — see `_cached_http_fetch`.
_ModuleRunner = Callable[[str, str, dict[str, Any], threading.Lock], dict[str, Any]]


def _cached_http_fetch(cache: dict[str, Any], cache_lock: threading.Lock, target: str) -> tuple:
    """
    Fetch `target` over HTTP(S) at most once per scan, shared by any module
    that needs it. Uses double-checked locking: the network call itself
    happens outside the lock (so concurrent modules aren't serialized behind
    it), and only the cache read/write is guarded. In the rare case two
    threads both miss the cache at once, both fetch and the second result
    is discarded — a harmless, self-correcting race, never a correctness bug.
    """
    with cache_lock:
        cached = cache.get("http_fetch")
    if cached is not None:
        return cached

    result = fetch_with_fallback(target, config.HTTP_TIMEOUT_SECONDS, config.HTTP_USER_AGENT)

    with cache_lock:
        cache.setdefault("http_fetch", result)
        return cache["http_fetch"]


def _run_port_scanner(target: str, _raw: str, _cache: dict[str, Any], _lock: threading.Lock) -> dict[str, Any]:
    # Read scan options placed into the request-scoped cache by the caller
    opts = _cache.get("scan_options") or {}
    profile = opts.get("profile", "quick")
    scan_all = bool(opts.get("scan_all_ips", False))
    return port_scanner.scan_ports(target, profile=profile, scan_all_ips=scan_all)


def _run_vulnerability_scanner(target: str, _raw: str, cache: dict[str, Any], lock: threading.Lock) -> dict[str, Any]:
    return vulnerability_scanner.scan_vulnerabilities(target, fetched=_cached_http_fetch(cache, lock, target))


def _run_ssl_analyzer(target: str, _raw: str, _cache: dict[str, Any], _lock: threading.Lock) -> dict[str, Any]:
    return ssl_analyzer.analyze_ssl(_raw)


def _run_dns_lookup(target: str, _raw: str, _cache: dict[str, Any], _lock: threading.Lock) -> dict[str, Any]:
    return dns_lookup.lookup_dns(target)


def _run_whois_lookup(target: str, _raw: str, _cache: dict[str, Any], _lock: threading.Lock) -> dict[str, Any]:
    return whois_lookup.lookup_whois(target)


def _run_technology_fingerprint(target: str, _raw: str, cache: dict[str, Any], lock: threading.Lock) -> dict[str, Any]:
    return technology_fingerprint.fingerprint(target, fetched=_cached_http_fetch(cache, lock, target))


_MODULE_RUNNERS: dict[str, _ModuleRunner] = {
    "port_scanner": _run_port_scanner,
    "vulnerability_scanner": _run_vulnerability_scanner,
    "ssl_analyzer": _run_ssl_analyzer,
    "dns_lookup": _run_dns_lookup,
    "whois_lookup": _run_whois_lookup,
    "technology_fingerprint": _run_technology_fingerprint,
}


def _error_response(message: str, status: int) -> tuple[Response, int]:
    return jsonify({"status": "error", "message": message}), status


def _run_modules(sanitized_target: str, raw_target: str, module_ids: list[str], scan_options: dict[str, Any] | None = None) -> tuple[dict[str, Any], dict[str, Any], threading.Lock]:
    """
    Execute every requested module concurrently, isolating failures so one
    broken/slow module never blocks or aborts the others — each module's
    own outcome (success or {"error": ...}) is recorded independently.

    Returns (results, cache, cache_lock) — cache/cache_lock are returned too
    so the caller can reuse the shared HTTP fetch / resolved IP for
    target_info gathering without issuing yet another request.
    """
    results: dict[str, Any] = {}
    cache: dict[str, Any] = {}
    if scan_options:
        cache.setdefault("scan_options", scan_options)
    cache_lock = threading.Lock()

    def run_one(module_id: str) -> tuple[str, dict[str, Any] | None]:
        runner = _MODULE_RUNNERS.get(module_id)
        if runner is None:
            return module_id, None
        try:
            return module_id, runner(sanitized_target, raw_target, cache, cache_lock)
        except Exception:  # noqa: BLE001 - isolate unexpected module failures
            logger.exception("Module '%s' raised an unexpected error for target %s", module_id, sanitized_target)
            return module_id, {"error": "This module failed unexpectedly. See server logs for details."}

    max_workers = max(1, min(config.SCAN_MAX_WORKERS, len(module_ids)))
    with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="scan-module") as executor:
        futures = [executor.submit(run_one, module_id) for module_id in module_ids]
        for future in as_completed(futures):
            module_id, result = future.result()
            if result is not None:
                results[module_id] = result

    return results, cache, cache_lock


@scan_bp.route("/api/scan", methods=["POST"])
@limiter.limit(lambda: config.RATELIMIT_SCAN)
def run_scan() -> tuple[Response, int]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error_response("Request body must be a JSON object.", 400)

    raw_target = payload.get("target")
    requested_modules = payload.get("modules")

    if not isinstance(requested_modules, list) or not requested_modules:
        return _error_response("Field 'modules' must be a non-empty list of module names.", 400)

    try:
        sanitized_target = sanitize_target(raw_target)
    except InvalidTargetError as exc:
        return _error_response(str(exc), 400)

    module_ids = normalize_module_names(requested_modules, config.MODULE_NAME_MAP)
    if not module_ids:
        return _error_response("None of the requested modules are recognized.", 400)

    scan_started_at = now_iso()
    started_perf = time.perf_counter()

    # Read optional scan options from the payload (frontend provides these)
    scan_profile = (payload.get("scan_profile") or "quick").lower()
    ip_mode = (payload.get("ip_mode") or "single").lower()
    scan_options = {"profile": scan_profile, "scan_all_ips": ip_mode in {"all", "all_resolved", "all_ips"}}

    logger.info("Starting scan for target=%s modules=%s profile=%s ip_mode=%s (concurrent)", sanitized_target, module_ids, scan_profile, ip_mode)
    results, cache, cache_lock = _run_modules(sanitized_target, str(raw_target), module_ids, scan_options)

    # Preserve the order the user requested, not thread-completion order.
    effective_modules = [m for m in module_ids if m in results]

    # Target Info is always gathered (not gated by module selection — see
    # modules/target_info.py) and reuses whatever HTTP fetch / resolved IP /
    # OS detection the selected modules already produced, rather than
    # issuing new requests or re-running nmap's OS fingerprinting.
    port_result = results.get("port_scanner")
    resolved_ip_hint = port_result.get("resolved_ip") if isinstance(port_result, dict) else None
    os_detection = port_result.get("os_detection") if isinstance(port_result, dict) else None
    command_used = port_result.get("command_line") if isinstance(port_result, dict) else None
    cached_fetch = cache.get("http_fetch")
    info = target_info_module.gather_target_info(
        sanitized_target, resolved_ip_hint=resolved_ip_hint, fetched=cached_fetch, os_detection=os_detection
    )

    findings = build_findings(results)
    recommendations = build_recommendations(findings)
    risk_score = calculate_risk_score(findings)

    scan_ended_at = now_iso()
    duration_ms = round((time.perf_counter() - started_perf) * 1000)

    scan_meta = {
        "started_at": scan_started_at,
        "ended_at": scan_ended_at,
        "duration_ms": duration_ms,
        "scanner_version": config.SCANNER_VERSION,
        "command_used": command_used,
    }

    record = ScanRecord(
        scan_id=generate_scan_id(),
        target=sanitized_target,
        timestamp=now_iso(),
        modules=effective_modules,
        results=results,
        risk_score=risk_score,
        target_info=info,
        findings=findings,
        recommendations=recommendations,
        scan_meta=scan_meta,
    )

    try:
        db.save_scan(record)
    except Exception:
        logger.exception("Failed to persist scan %s", record.scan_id)
        return _error_response("Scan completed but could not be saved.", 500)

    return jsonify({"status": "success", "scan_id": record.scan_id, "results": record.to_full_dict()}), 200


@scan_bp.route("/api/results/<scan_id>", methods=["GET"])
def get_results(scan_id: str) -> tuple[Response, int]:
    record = db.get_scan(scan_id)
    if record is None:
        return _error_response(f"No scan found with id '{scan_id}'.", 404)
    return jsonify({"status": "success", "scan_id": scan_id, "results": record.to_full_dict()}), 200
