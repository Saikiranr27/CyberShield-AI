"""
Target Info module (always computed — not user-selectable).

Unlike the other modules, this runs automatically for every scan regardless
of which modules were selected: it's baseline context (resolved IP, reverse
DNS, live HTTP status, and geolocation) rather than an offensive scan step,
and it's cheap (one DNS resolve, one reverse lookup, one short geolocation
HTTP call).

Geolocation (country/region/city/ASN/ISP) comes from ip-api.com's free JSON
API — a real third-party data source, not fabricated. If it's unreachable
(network restrictions, rate limiting) those fields are left null rather
than guessed. Every other field here is derived directly from a real DNS
resolution / reverse lookup / HTTP response.
"""

from __future__ import annotations

import socket
from typing import Any

import requests

from config import config
from utils.helpers import fetch_with_fallback
from utils.logger import get_logger

logger = get_logger("modules.target_info")

_GEO_TIMEOUT_SECONDS = 4
_GEO_API_URL = "http://ip-api.com/json/{ip}?fields=status,country,regionName,city,isp,org,as,query"


def _resolve_ip(hostname: str) -> str | None:
    try:
        return socket.gethostbyname(hostname)
    except OSError:
        return None


def _resolve_ipv6(hostname: str) -> str | None:
    try:
        infos = socket.getaddrinfo(hostname, None, socket.AF_INET6)
        return infos[0][4][0] if infos else None
    except OSError:
        return None


def _reverse_dns(ip: str | None) -> str | None:
    if not ip:
        return None
    try:
        return socket.gethostbyaddr(ip)[0]
    except OSError:
        return None


def _geolocate(ip: str | None) -> dict[str, Any]:
    empty = {"country": None, "region": None, "city": None, "isp": None, "org": None, "asn": None}
    if not ip:
        return empty
    try:
        resp = requests.get(_GEO_API_URL.format(ip=ip), timeout=_GEO_TIMEOUT_SECONDS)
        data = resp.json()
        if data.get("status") != "success":
            return empty
        return {
            "country": data.get("country"),
            "region": data.get("regionName"),
            "city": data.get("city"),
            "isp": data.get("isp"),
            "org": data.get("org"),
            "asn": data.get("as"),
        }
    except (requests.exceptions.RequestException, ValueError) as exc:
        logger.info("Geolocation lookup unavailable for %s: %s", ip, exc)
        return empty


def gather_target_info(
    hostname: str,
    resolved_ip_hint: str | None = None,
    fetched: tuple | None = None,
    os_detection: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Returns:
        {
            "hostname": str, "ip_address": str|None, "ipv6_address": str|None,
            "reverse_dns": str|None, "live": bool, "http_status": int|None,
            "https_available": bool|None, "server_banner": str|None,
            "response_time_ms": int|None, "operating_system": str|None,
            "country": str|None, "region": str|None, "city": str|None,
            "isp": str|None, "org": str|None, "asn": str|None,
        }
    Never returns {"error": ...} — every field degrades to null independently
    so a DNS or geolocation hiccup never blocks the rest of the scan.

    `os_detection`, if provided, is Port Scanner's real `os_detection` result
    (see modules/port_scanner.py) — reused here rather than running nmap's
    OS fingerprinting a second time. Only populated when Port Scanner ran
    and the backend has root privileges (nmap -O requires root); otherwise
    "operating_system" is left null, never guessed.
    """
    ip_address = resolved_ip_hint or _resolve_ip(hostname)
    ipv6_address = _resolve_ipv6(hostname)
    reverse_dns = _reverse_dns(ip_address)

    if fetched is not None:
        response, _scheme, https_available, _error = fetched
    else:
        response, _scheme, https_available, _error = fetch_with_fallback(
            hostname, config.HTTP_TIMEOUT_SECONDS, config.HTTP_USER_AGENT
        )

    live = response is not None
    http_status = response.status_code if response is not None else None
    server_banner = response.headers.get("Server") if response is not None else None
    response_time_ms = round(response.elapsed.total_seconds() * 1000) if response is not None else None

    operating_system = None
    if os_detection and os_detection.get("name"):
        accuracy = os_detection.get("accuracy")
        operating_system = f"{os_detection['name']} ({accuracy}% confidence)" if accuracy else os_detection["name"]

    geo = _geolocate(ip_address)

    return {
        "hostname": hostname,
        "ip_address": ip_address,
        "ipv6_address": ipv6_address,
        "reverse_dns": reverse_dns,
        "live": live,
        "http_status": http_status,
        "https_available": https_available,
        "server_banner": server_banner,
        "response_time_ms": response_time_ms,
        "operating_system": operating_system,
        **geo,
    }
