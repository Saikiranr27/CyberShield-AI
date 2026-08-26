"""
DNS Lookup module.

Resolves common record types for a domain using dnspython, handling each
record type independently so a missing MX or CNAME doesn't fail the whole
lookup. Each returned record includes its real TTL. PTR (reverse DNS) is
resolved for every unique A/AAAA address found — a genuine reverse lookup,
not a guess.

NOTE (module contract change): each record type now maps to a list of
{"value": str, "ttl": int | None} objects instead of a bare list of
strings, so the real TTL can be surfaced end-to-end. Every internal
consumer (utils/analysis.py, reports/pdf_report.py) was updated to match.
"""

from __future__ import annotations

from typing import Any

import dns.exception
import dns.resolver
import dns.reversename

from utils.logger import get_logger

logger = get_logger("modules.dns_lookup")

RECORD_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"]


def _format_value(record_type: str, rdata: Any) -> str:
    if record_type == "MX":
        return f"{rdata.preference} {rdata.exchange.to_text().rstrip('.')}"
    if record_type == "TXT":
        return b"".join(rdata.strings).decode("utf-8", errors="replace")
    if record_type == "SOA":
        return (
            f"mname={rdata.mname.to_text().rstrip('.')} rname={rdata.rname.to_text().rstrip('.')} "
            f"serial={rdata.serial} refresh={rdata.refresh} retry={rdata.retry} "
            f"expire={rdata.expire} minimum={rdata.minimum}"
        )
    return rdata.to_text().rstrip(".")


def _resolve_one(domain: str, record_type: str, resolver: "dns.resolver.Resolver") -> list[dict[str, Any]]:
    try:
        answers = resolver.resolve(domain, record_type)
    except dns.resolver.NoAnswer:
        return []
    except dns.resolver.NXDOMAIN:
        raise
    except dns.exception.Timeout:
        logger.warning("DNS %s lookup timed out for %s", record_type, domain)
        return []
    except dns.exception.DNSException as exc:
        logger.warning("DNS %s lookup failed for %s: %s", record_type, domain, exc)
        return []

    ttl = answers.rrset.ttl if answers.rrset is not None else None
    return [{"value": _format_value(record_type, rdata), "ttl": ttl} for rdata in answers]


def _resolve_ptr(ip: str, resolver: "dns.resolver.Resolver") -> list[dict[str, Any]]:
    """Genuine reverse-DNS lookup for a single IP (best-effort — many IPs have none)."""
    try:
        reverse_name = dns.reversename.from_address(ip)
        answers = resolver.resolve(reverse_name, "PTR")
    except Exception:  # noqa: BLE001 - reverse DNS is best-effort, never fatal
        return []
    ttl = answers.rrset.ttl if answers.rrset is not None else None
    return [{"value": r.to_text().rstrip("."), "ttl": ttl, "for_ip": ip} for r in answers]


def lookup_dns(domain: str) -> dict[str, Any]:
    """
    Returns:
        {
            "A": [{"value": str, "ttl": int}, ...], "AAAA": [...], "MX": [...],
            "TXT": [...], "NS": [...], "CNAME": [...], "SOA": [...], "PTR": [...]
        }
        or {"error": str} if the domain doesn't exist at all.
    """
    resolver = dns.resolver.Resolver()
    resolver.timeout = 4
    resolver.lifetime = 4

    result: dict[str, list[dict[str, Any]]] = {}
    try:
        for record_type in RECORD_TYPES:
            result[record_type] = _resolve_one(domain, record_type, resolver)
    except dns.resolver.NXDOMAIN:
        return {"error": f"Domain '{domain}' does not exist (NXDOMAIN)."}
    except Exception as exc:  # noqa: BLE001
        logger.exception("DNS lookup failed for %s", domain)
        return {"error": f"DNS lookup failed: {exc}"}

    ptr_records: list[dict[str, Any]] = []
    seen_ips: set[str] = set()
    for record_type in ("A", "AAAA"):
        for record in result.get(record_type, []):
            ip = record["value"]
            if ip in seen_ips:
                continue
            seen_ips.add(ip)
            ptr_records.extend(_resolve_ptr(ip, resolver))
    result["PTR"] = ptr_records

    return result
