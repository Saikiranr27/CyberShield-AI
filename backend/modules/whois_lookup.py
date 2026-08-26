"""
WHOIS Lookup module.

Wraps python-whois, normalizing its sometimes-inconsistent return shapes
(single values vs. lists, datetime vs. string) into a stable JSON-safe dict.
"""

from __future__ import annotations

import datetime
from typing import Any

from utils.logger import get_logger

logger = get_logger("modules.whois_lookup")

try:
    import whois  # python-whois
except ImportError:  # pragma: no cover - environment dependent
    whois = None  # type: ignore[assignment]


def _first(value: Any) -> Any:
    """python-whois sometimes returns a list for fields that are conceptually singular."""
    if isinstance(value, (list, tuple)):
        return value[0] if value else None
    return value


def _to_iso(value: Any) -> str | None:
    value = _first(value)
    if value is None:
        return None
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    return str(value)


def _to_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return sorted({str(v) for v in value if v})
    return [str(value)]


def lookup_whois(domain: str) -> dict[str, Any]:
    """
    Returns:
        {
            "registrar": str | None,
            "creation_date": str | None,
            "expiration_date": str | None,
            "updated_date": str | None,
            "name_servers": [str, ...],
            "domain_status": [str, ...],
            "registrant_country": str | None,
        }
        or {"error": str} on failure. Many registrars redact registrant
        details (GDPR etc.) — `registrant_country` is commonly None, which
        is left as None rather than guessed.
    """
    if whois is None:
        return {"error": "python-whois is not installed on the server."}

    try:
        record = whois.whois(domain)
    except Exception as exc:  # noqa: BLE001 - python-whois raises assorted errors
        logger.warning("WHOIS lookup failed for %s: %s", domain, exc)
        return {"error": f"WHOIS lookup failed: {exc}"}

    if not record or not record.get("domain_name"):
        return {"error": f"No WHOIS record found for '{domain}'."}

    creation_iso = _to_iso(record.get("creation_date"))
    domain_age_days = None
    if creation_iso:
        try:
            created = datetime.datetime.fromisoformat(creation_iso)
            if created.tzinfo is None:
                created = created.replace(tzinfo=datetime.timezone.utc)
            domain_age_days = (datetime.datetime.now(datetime.timezone.utc) - created).days
        except ValueError:
            pass

    return {
        "registrar": _first(record.get("registrar")),
        "creation_date": creation_iso,
        "expiration_date": _to_iso(record.get("expiration_date")),
        "updated_date": _to_iso(record.get("updated_date")),
        "name_servers": _to_list(record.get("name_servers")),
        "domain_status": _to_list(record.get("status")),
        "registrant_country": _first(record.get("country")),
        "domain_age_days": domain_age_days,
    }
