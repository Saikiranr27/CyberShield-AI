"""
Application configuration for CyberSentinel AI backend.

All tunables are read from environment variables with sane defaults so the
app runs out of the box, but can be hardened/reconfigured for production
without touching code.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _env_bool(name: str, default: bool) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: list[str]) -> list[str]:
    val = os.environ.get(name)
    if not val:
        return default
    return [item.strip() for item in val.split(",") if item.strip()]


class Config:
    """Central configuration object used by app.py and every submodule."""

    # --- Server -------------------------------------------------------
    HOST: str = os.environ.get("HOST", "0.0.0.0")
    PORT: int = int(os.environ.get("PORT", "5000"))
    DEBUG: bool = _env_bool("DEBUG", False)

    # --- CORS -----------------------------------------------------------
    CORS_ORIGINS: list[str] = _env_list(
        "CORS_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # --- Rate limiting -------------------------------------------------------
    # Per-client-IP. Scans are expensive (nmap + ~15 HTTP requests + TLS
    # handshakes + DNS/WHOIS), so /api/scan gets a much tighter limit than
    # everything else. Storage is in-memory by default (fine for a single
    # process/dev server); point RATELIMIT_STORAGE_URI at Redis for multi-worker
    # production deployments so limits are shared across workers.
    RATELIMIT_ENABLED: bool = _env_bool("RATELIMIT_ENABLED", True)
    RATELIMIT_STORAGE_URI: str = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT: str = os.environ.get("RATELIMIT_DEFAULT", "60 per minute")
    RATELIMIT_SCAN: str = os.environ.get("RATELIMIT_SCAN", "5 per minute")

    # --- Database ---------------------------------------------------------
    DATABASE_PATH: str = os.environ.get(
        "DATABASE_PATH", str(BASE_DIR / "database" / "cybersentinel.db")
    )

    # --- Reports / scan artifacts -----------------------------------------
    SCANS_DIR: str = os.environ.get("SCANS_DIR", str(BASE_DIR / "scans"))

    # --- Logging ------------------------------------------------------------
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.environ.get("LOG_FILE", str(BASE_DIR / "cybersentinel.log"))

    # --- Port Scanner ---------------------------------------------------------
    # Bounded default range to keep scan latency reasonable for an HTTP request.
    # Override with a full range (e.g. "1-65535") only in trusted/offline environments.
    NMAP_PORT_RANGE: str = os.environ.get(
        "NMAP_PORT_RANGE", "21-23,25,53,80,110,135,139,143,443,445,3306,3389,5432,8080,8443"
    )
    NMAP_ARGS: str = os.environ.get("NMAP_ARGS", "-sT -sV -T4 --reason --version-intensity 2 --host-timeout 40s")
    NMAP_TIMEOUT_SECONDS: int = int(os.environ.get("NMAP_TIMEOUT_SECONDS", "55"))

    # OS Detection (nmap -O) is a SEPARATE, best-effort probe — never merged into
    # NMAP_ARGS above. `nmap -O` requires root and, critically, ABORTS THE ENTIRE
    # SCAN with exit code 1 for a non-root user (verified directly: "TCP/IP
    # fingerprinting (for OS scan) requires root privileges. QUITTING!") rather
    # than gracefully skipping just the OS portion. Baking it into the main scan
    # would silently break port scanning for every non-root install (e.g. the
    # default non-root Kali user). It's attempted as an independent, isolated,
    # short-timeout call; failure only means no OS guess, never a broken scan.
    NMAP_OS_DETECTION_ARGS: str = os.environ.get(
        "NMAP_OS_DETECTION_ARGS", "-O --osscan-guess --max-os-tries 1 --host-timeout 15s"
    )
    NMAP_OS_DETECTION_TIMEOUT_SECONDS: int = int(os.environ.get("NMAP_OS_DETECTION_TIMEOUT_SECONDS", "20"))

    # --- HTTP-based modules (vulnerability scanner, technology fingerprinting) --
    HTTP_TIMEOUT_SECONDS: int = int(os.environ.get("HTTP_TIMEOUT_SECONDS", "8"))
    HTTP_USER_AGENT: str = os.environ.get(
        "HTTP_USER_AGENT", "CyberSentinelAI-Scanner/1.0 (+https://cybersentinel.local)"
    )

    # --- SSL Analyzer --------------------------------------------------------
    SSL_TIMEOUT_SECONDS: int = int(os.environ.get("SSL_TIMEOUT_SECONDS", "6"))
    SSL_RETRY_ON_TIMEOUT: bool = _env_bool("SSL_RETRY_ON_TIMEOUT", True)
    SSL_CHAIN_TIMEOUT_SECONDS: int = int(os.environ.get("SSL_CHAIN_TIMEOUT_SECONDS", "8"))

    # --- Scan orchestration ----------------------------------------------------
    # Human-readable module names accepted from the frontend, mapped to internal ids.
    # Exactly 6 modules, per spec: Port Scanner, Vulnerability Scanner, DNS Lookup,
    # WHOIS Lookup, SSL Analyzer, Technology Fingerprinting.
    MODULE_NAME_MAP: dict[str, str] = {
        "port scanner": "port_scanner",
        "vulnerability scanner": "vulnerability_scanner",
        "dns lookup": "dns_lookup",
        "dns enumeration": "dns_lookup",
        "whois lookup": "whois_lookup",
        "ssl analyzer": "ssl_analyzer",
        "technology fingerprinting": "technology_fingerprint",
    }

    # Independent modules run concurrently (I/O-bound: network/DNS/TLS/HTTP calls
    # release the GIL, so a thread pool gives real wall-clock speedup). All 6
    # modules are mutually independent — none needs another's *output* — so the
    # whole set runs in one pool; only the shared HTTP fetch (vulnerability
    # scanner + technology fingerprinting) needs a lock, handled in api/scan.py.
    SCAN_MAX_WORKERS: int = int(os.environ.get("SCAN_MAX_WORKERS", "6"))

    # --- Reported identity (Scan Details panel) ---------------------------------
    SCANNER_VERSION: str = os.environ.get("SCANNER_VERSION", "CyberSentinel AI Backend v1.1.0")


config = Config()
