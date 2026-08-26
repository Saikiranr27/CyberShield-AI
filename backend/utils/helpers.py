"""
Shared, stateless helper functions used across API routes and scan modules.
"""

from __future__ import annotations

import ipaddress
import re
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

from utils.logger import get_logger

logger = get_logger("utils.helpers")

# Hostnames: labels of letters/digits/hyphens, dot-separated, 1-253 chars total.
_HOSTNAME_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$"
)


class InvalidTargetError(ValueError):
    """Raised when a user-supplied scan target fails validation/sanitization."""


def generate_scan_id() -> str:
    """Generate a unique scan identifier."""
    return str(uuid.uuid4())


def now_iso() -> str:
    """Current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


def is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def is_valid_hostname(value: str) -> bool:
    return bool(_HOSTNAME_RE.match(value))


def sanitize_target(raw_target: str) -> str:
    """
    Validate and normalize a user-supplied scan target.

    This is a hard security boundary: the result is passed to python-nmap
    (which shells out to the nmap binary) and to HTTP/DNS/WHOIS clients.
    We deliberately:
      - strip any URL scheme/path/query, keeping only the host
      - reject anything that isn't a syntactically valid hostname or IP
      - reject values starting with '-' (would be parsed as a CLI flag
        by the underlying nmap binary otherwise)
      - reject embedded whitespace/control characters

    Raises InvalidTargetError on anything that doesn't pass.
    """
    if not raw_target or not isinstance(raw_target, str):
        raise InvalidTargetError("Target is required.")

    candidate = raw_target.strip()

    if not candidate:
        raise InvalidTargetError("Target is required.")

    if any(ch.isspace() or ord(ch) < 32 for ch in candidate):
        raise InvalidTargetError("Target contains invalid whitespace/control characters.")

    # Allow the user to paste a full URL; reduce it to just the host.
    if "://" in candidate:
        parsed = urlparse(candidate)
        host = parsed.hostname
    else:
        # Strip a trailing path if someone pastes "example.com/some/path".
        host = candidate.split("/")[0]
        # Strip a port suffix like "example.com:8080" -> "example.com".
        if host.count(":") == 1 and not is_valid_ip(host):
            host = host.split(":")[0]

    if not host:
        raise InvalidTargetError("Could not parse a valid host from the target.")

    if host.startswith("-"):
        raise InvalidTargetError("Target must not start with '-'.")

    if is_valid_ip(host):
        return host

    if is_valid_hostname(host):
        return host.lower()

    raise InvalidTargetError(f"'{raw_target}' is not a valid hostname or IP address.")


def normalize_module_names(requested: list[str], name_map: dict[str, str]) -> list[str]:
    """
    Convert frontend-facing module display names (e.g. "Port Scanner") into
    internal module ids (e.g. "port_scanner"), ignoring anything unrecognized.
    """
    resolved: list[str] = []
    for item in requested or []:
        if not isinstance(item, str):
            continue
        key = item.strip().lower()
        module_id = name_map.get(key)
        if module_id and module_id not in resolved:
            resolved.append(module_id)
        elif not module_id:
            logger.warning("Ignoring unrecognized scan module requested: %r", item)
    return resolved


def parse_port_range(range_str: str) -> list[int]:
    """Expand a comma-separated nmap-style port range string (e.g. '21-23,80,443') into a sorted list of ints."""
    ports: list[int] = []
    for chunk in range_str.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start, end = chunk.split("-", 1)
            ports.extend(range(int(start), int(end) + 1))
        else:
            ports.append(int(chunk))
    return sorted(set(ports))


def fetch_with_fallback(host: str, timeout: int, user_agent: str):
    """
    Try HTTPS first, then plain HTTP, for a bare hostname.

    Returns a tuple (response, scheme_used, https_available, error_message).
    Only one of (response, error_message) will be meaningful.
    Kept here (rather than duplicated in every HTTP-based module) since it's
    pure request plumbing, not module-specific analysis logic.
    """
    import requests  # local import keeps this helper optional for non-HTTP modules

    headers = {"User-Agent": user_agent}
    last_error: str | None = None

    for scheme in ("https", "http"):
        url = f"{scheme}://{host}"
        try:
            response = requests.get(
                url, headers=headers, timeout=timeout, allow_redirects=True, verify=True
            )
            return response, scheme, scheme == "https", None
        except requests.exceptions.SSLError as exc:
            last_error = f"TLS error contacting {url}: {exc}"
            continue
        except requests.exceptions.RequestException as exc:
            last_error = f"Could not reach {url}: {exc}"
            continue

    return None, None, False, last_error or "Target did not respond over HTTPS or HTTP."


def risk_label(score: int) -> str:
    """Risk bands: 0-20 Low, 21-40 Medium, 41-70 High, 71-100 Critical."""
    if score >= 71:
        return "Critical"
    if score >= 41:
        return "High"
    if score >= 21:
        return "Medium"
    return "Low"
