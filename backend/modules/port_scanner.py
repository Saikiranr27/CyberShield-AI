"""
Port Scanner module.

Primary implementation uses python-nmap (which shells out to the real
`nmap` binary) for accurate service/version detection. If the nmap binary
isn't installed on the host running this backend, we transparently fall
back to a pure-Python socket connect-scan over the same port list so the
API still returns a useful (if less detailed) result instead of a 500.

Returns EVERY scanned port (open, closed, and filtered) — verified against
a live nmap run that an explicit `-p` port list is reported in full by
nmap itself (it only omits ports when scanning a large default range
without `-p`), so no port is silently dropped.
"""

from __future__ import annotations

import socket
import time
from typing import Any

from config import config
from utils.analysis import HIGH_RISK_PORTS_CRITICAL, HIGH_RISK_PORTS_HIGH
from utils.helpers import parse_port_range
from utils.logger import get_logger

logger = get_logger("modules.port_scanner")

try:
    import nmap  # python-nmap
except ImportError:  # pragma: no cover - environment dependent
    nmap = None  # type: ignore[assignment]


def _port_risk(port: int, state: str) -> str:
    """Risk only applies to a port that's actually reachable — closed/filtered ports carry none."""
    if state != "open":
        return "none"
    if port in HIGH_RISK_PORTS_CRITICAL:
        return "critical"
    if port in HIGH_RISK_PORTS_HIGH:
        return "high"
    if port in {80, 443, 8080, 8443}:
        return "low"
    return "medium"


def _port_recommendation(port: int, service: str, state: str, risk: str) -> str:
    """A short, concrete per-port action — empty for non-open ports (nothing to act on)."""
    if state != "open":
        return ""
    if risk == "critical":
        return f"Restrict or disable this legacy/unauthenticated service on port {port}."
    if risk == "high":
        return f"Restrict public access to {service} (port {port}) — do not expose databases/admin interfaces directly to the internet."
    if port == 22:
        return "Ensure SSH uses key-based authentication, disables root login, and is kept patched."
    if port in {80, 443, 8080, 8443}:
        return "Ensure the web server and its software stack are kept up to date."
    return f"Verify {service} on port {port} is intentionally exposed and kept up to date."


def _fallback_socket_scan(hosts: list[str], ports: list[int]) -> list[dict[str, Any]]:
    """Best-effort TCP connect scan used when the nmap binary is unavailable.

    Scans each host in `hosts` across the provided `ports` list and returns
    per-host port entries with an `ip` field attached.
    """
    results: list[dict[str, Any]] = []
    for host in hosts:
        for port in ports:
            state = "closed"
            reason = "conn-refused"
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    sock.settimeout(0.6)
                    outcome = sock.connect_ex((host, port))
                    if outcome == 0:
                        state, reason = "open", "conn-established"
                    else:
                        state, reason = "closed", "conn-refused"
            except socket.timeout:
                state, reason = "filtered", "no-response"
            except socket.gaierror as exc:
                raise ValueError(f"Could not resolve host '{host}': {exc}") from exc
            except OSError:
                state, reason = "filtered", "unreachable"

            service = "unknown"
            if state == "open":
                try:
                    service = socket.getservbyport(port, "tcp")
                except OSError:
                    service = "unknown"

            results.append(
                {
                    "ip": host,
                    "port": port,
                    "protocol": "tcp",
                    "service": service,
                    "product": "",
                    "version": "Not disclosed",
                    "banner": "",
                    "state": state,
                    "reason": reason,
                    "risk": _port_risk(port, state),
                    "recommendation": _port_recommendation(port, service, state, _port_risk(port, state)),
                }
            )

    return results


def _detect_os(target: str) -> dict[str, Any] | None:
    """
    Best-effort OS fingerprint via a SEPARATE `nmap -O` invocation — never
    merged into the main scan (see config.py's NMAP_OS_DETECTION_ARGS comment
    for why: `-O` aborts nmap entirely for non-root users, exit code 1, no
    scan performed at all — verified directly). Any failure here (most
    commonly "requires root privileges") returns None; it can never affect
    the main port scan's success.

    Returns the single highest-confidence guess nmap reports, exactly as
    nmap phrases it (name + accuracy %) — nmap itself calls this "JUST
    GUESSING" in its own output, so we surface the accuracy rather than
    imply certainty.
    """
    if nmap is None:
        return None
    try:
        os_scanner = nmap.PortScanner()
        os_scanner.scan(
            hosts=target,
            arguments=config.NMAP_OS_DETECTION_ARGS,
            timeout=config.NMAP_OS_DETECTION_TIMEOUT_SECONDS,
        )
        hosts = os_scanner.all_hosts()
        if not hosts:
            return None
        matches = os_scanner[hosts[0]].get("osmatch") or []
        if not matches:
            return None
        best = matches[0]
        osclass = (best.get("osclass") or [{}])[0]
        return {
            "name": best.get("name"),
            "accuracy": int(best.get("accuracy", 0)) if best.get("accuracy") else None,
            "family": osclass.get("osfamily"),
        }
    except Exception as exc:  # noqa: BLE001 - most commonly "requires root privileges"
        logger.info("OS detection unavailable for %s (%s) — typically requires root privileges.", target, exc)
        return None


def _summarize(
    engine: str,
    scanned_ports: list[dict[str, Any]],
    total_requested: int,
    resolved_ip: str | None,
    scan_duration_ms: int,
    os_detection: dict[str, Any] | None = None,
) -> dict[str, Any]:
    total_requested = total_requested
    state_counts = {"open": 0, "closed": 0, "filtered": 0}
    for entry in scanned_ports:
        state_counts[entry["state"]] = state_counts.get(entry["state"], 0) + 1
    # Safety net: if nmap ever omits a requested port from its output (e.g. a
    # very unusual host/network condition), count the gap as closed rather
    # than silently under-reporting the total.
    missing = max(0, total_requested - len(scanned_ports))
    state_counts["closed"] += missing

    all_ports = sorted(scanned_ports, key=lambda p: p["port"])
    open_ports = [p for p in all_ports if p["state"] == "open"]

    return {
        "engine": engine,
        "port_range": config.NMAP_PORT_RANGE,
        "scan_duration_ms": scan_duration_ms,
        "total_scanned": total_requested,
        "resolved_ip": resolved_ip,
        "os_detection": os_detection,  # None unless running as root with nmap available
        "ports": all_ports,  # every scanned port — open, closed, and filtered
        "open_ports": open_ports,  # kept for backward compatibility with existing consumers
        "total_open": len(open_ports),
        "state_counts": state_counts,
    }


def scan_ports(target: str, profile: str = "quick", scan_all_ips: bool = False) -> dict[str, Any]:
    """
    Scan `target` across the configured port range.

    Returns:
        {
            "engine": "nmap" | "socket-fallback",
            "port_range": str,
            "scan_duration_ms": int,
            "total_scanned": int,
            "resolved_ip": str | None,
            "os_detection": {"name": str, "accuracy": int, "family": str} | None,  # None unless root
            "ports": [{"port": int, "protocol": str, "service": str, "product": str, "version": str,
                       "banner": str, "state": "open"|"closed"|"filtered", "reason": str, "risk": str,
                       "recommendation": str}, ...],
            "open_ports": [... same shape, open only ...],   # backward-compatible subset
            "total_open": int,
            "state_counts": {"open": int, "closed": int, "filtered": int},
        }
        or {"error": str} on failure.
    """
    started = time.perf_counter()

    # Determine host list: either the single target string (hostname) or
    # resolve all A records when scanning multiple IPs is requested.
    hosts_to_scan: list[str] = [target]
    resolved_ips: list[str] = []
    if scan_all_ips:
        try:
            import socket as _socket

            infos = _socket.getaddrinfo(target, None, _socket.AF_INET)
            resolved_ips = sorted({i[4][0] for i in infos})
            if resolved_ips:
                hosts_to_scan = resolved_ips
        except Exception:
            # Resolution failure falls back to single-host behavior
            resolved_ips = []

    # Build nmap args/ports depending on requested profile
    extra_args = config.NMAP_ARGS
    ports_arg: str | None = config.NMAP_PORT_RANGE
    if profile == "standard":
        # top 1000 ports (nmap default is top 1000 when no -p provided)
        ports_arg = None
        extra_args = f"{config.NMAP_ARGS} --top-ports 1000"
    elif profile == "full":
        ports_arg = "1-65535"

    # Build the explicit list of requested ports (used for totals and fallback)
    if profile == "standard":
        requested_ports = list(range(1, 1001))
    else:
        requested_ports = parse_port_range(ports_arg or config.NMAP_PORT_RANGE)

    if nmap is not None:
        try:
            scanner = nmap.PortScanner()
            scanner.scan(
                hosts=','.join(hosts_to_scan),
                ports=ports_arg or "",
                arguments=extra_args,
                timeout=config.NMAP_TIMEOUT_SECONDS,
            )

            # BUG FIX: python-nmap keys scanner.all_hosts() by the address nmap
            # resolved to and reported in its XML output — which is the *resolved
            # IP*, not the original hostname string passed as `hosts=`. Checking
            # `target in scanner.all_hosts()` therefore silently fails (False)
            # for every hostname target (e.g. "nmap.org" -> reported under
            # "45.33.32.156"), even though the scan succeeded and found open
            # ports. A single-target scan produces at most one host entry, so we
            # take whichever key nmap actually used instead of re-matching the
            # input string. Reproduced and verified against a live target before
            # this fix (scanner.all_hosts() == ['<resolved ip>'], not the hostname).
            scanned_ports: list[dict[str, Any]] = []
            resolved_hosts = scanner.all_hosts()

            if not resolved_hosts:
                # nmap can exit 0 with zero hosts reported (most commonly a
                # `--host-timeout` hit under -sV's slower per-port probing on
                # an unusually slow/lossy network) — this is NOT an exception
                # python-nmap raises, so without this check it would silently
                # produce an empty "0 ports found" result instead of falling
                # back like a genuine nmap failure does. Treat it the same way.
                raise RuntimeError("nmap completed but reported no hosts (likely a host-timeout).")
            # Iterate each host reported by nmap (resolved IP keys) and
            # collect per-host port entries with an attached `ip` field.
            for host in resolved_hosts:
                host_info = scanner[host]
                for proto in host_info.all_protocols():
                    for port, meta in host_info[proto].items():
                        state = meta.get("state", "unknown")
                        product = meta.get("product", "")
                        version = meta.get("version", "")
                        extrainfo = meta.get("extrainfo", "")
                        cpe = meta.get("cpe", "")
                        banner_parts = [p for p in [extrainfo, cpe] if p]
                        risk = _port_risk(int(port), state)
                        service = meta.get("name", "unknown")
                        scanned_ports.append(
                            {
                                "ip": host,
                                "port": int(port),
                                "protocol": proto,
                                "service": service,
                                "product": product or "",
                                "version": version or "Not disclosed",
                                "banner": " / ".join(banner_parts),
                                "state": state,
                                "reason": meta.get("reason", "unknown"),
                                "risk": risk,
                                "recommendation": _port_recommendation(int(port), service, state, risk),
                            }
                        )

            duration_ms = round((time.perf_counter() - started) * 1000)
            # Choose an OS detection hint only for the first host (best-effort).
            os_detection = _detect_os(hosts_to_scan[0])
            command_line = None
            try:
                command_line = scanner.command_line()
            except Exception:  # noqa: BLE001 - purely informational, never fatal
                pass
            total_requested = len(requested_ports) * max(1, len(hosts_to_scan))
            result = _summarize("nmap", scanned_ports, total_requested, resolved_ips[0] if resolved_ips else (resolved_hosts[0] if resolved_hosts else None), duration_ms, os_detection)
            result["command_line"] = command_line
            result["scan_profile"] = profile
            result["ips_scanned"] = resolved_ips or resolved_hosts
            return result
        except Exception as exc:  # noqa: BLE001 - nmap raises several distinct error types
            logger.warning("nmap scan failed for %s (%s); falling back to socket scan.", target, exc)

    try:
        scanned_ports = _fallback_socket_scan(hosts_to_scan, requested_ports)
        resolved_ip = resolved_ips[0] if resolved_ips else None
        duration_ms = round((time.perf_counter() - started) * 1000)
        total_requested = len(requested_ports) * max(1, len(hosts_to_scan))
        return _summarize("socket-fallback", scanned_ports, total_requested, resolved_ip, duration_ms)
    except ValueError as exc:
        logger.error("Port scan failed for %s: %s", target, exc)
        return {"error": str(exc)}
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected port scan failure for %s", target)
        return {"error": "Port scan failed due to an internal error."}
