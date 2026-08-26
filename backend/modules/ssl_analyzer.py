"""
SSL Analyzer module.

Opens a real TLS connection to the target on port 443 and inspects the
peer certificate and negotiated protocol/cipher. Every field here comes
from the actual TLS handshake and certificate — nothing is fabricated.

`security_grade` is an explicit, documented heuristic (A+/A/B/C/D/F, not
an official Qualys SSL Labs grade) derived from the real protocol version,
cipher strength, and certificate validity observed during the handshake.

The full certificate chain (beyond the leaf certificate) isn't reachable
through Python's standard `ssl` module without either Python 3.13+'s
`get_verified_chain()` or an extra TLS library — instead we shell out to
the system `openssl` CLI (`openssl s_client -showcerts`), which is present
on effectively every Linux install including Kali, and parse the real PEM
chain it returns with `cryptography`. If `openssl` isn't available, the
chain is simply omitted (empty list) rather than fabricated.
"""

from __future__ import annotations

import socket
import ssl
import subprocess
from datetime import datetime, timezone
from typing import Any

from config import config
from utils.logger import get_logger

logger = get_logger("modules.ssl_analyzer")

_CERT_DATE_FORMAT = "%b %d %H:%M:%S %Y %Z"

try:
    from cryptography import x509
    from cryptography.hazmat.primitives.asymmetric import ec, rsa
except ImportError:  # pragma: no cover - environment dependent
    x509 = None  # type: ignore[assignment]

_INSECURE_PROTOCOLS = {"SSLv2", "SSLv3", "TLSv1", "TLSv1.1"}


def _parse_cert_date(value: str) -> datetime:
    return datetime.strptime(value, _CERT_DATE_FORMAT).replace(tzinfo=timezone.utc)


def _format_dn(dn_tuples: tuple) -> str:
    """Flatten an x509 name (tuple of tuples of (key, value) pairs) into 'CN=..., O=...'."""
    parts = []
    for rdn in dn_tuples:
        for key, value in rdn:
            parts.append(f"{key}={value}")
    return ", ".join(parts)


def _public_key_info(cert_obj) -> dict[str, Any]:
    key = cert_obj.public_key()
    if isinstance(key, rsa.RSAPublicKey):
        return {"algorithm": "RSA", "key_size": key.key_size}
    if isinstance(key, ec.EllipticCurvePublicKey):
        return {"algorithm": f"EC ({key.curve.name})", "key_size": key.key_size}
    return {"algorithm": type(key).__name__, "key_size": getattr(key, "key_size", None)}


def _subject_alt_names(cert_obj) -> list[str]:
    try:
        ext = cert_obj.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        return ext.value.get_values_for_type(x509.DNSName)
    except x509.ExtensionNotFound:
        return []


def _get_certificate_chain(hostname: str, port: int) -> list[dict[str, Any]]:
    """
    Real full certificate chain via `openssl s_client -showcerts`. Returns
    [] (not an error) if openssl isn't installed or the probe fails — the
    rest of the SSL analysis doesn't depend on this.
    """
    if x509 is None:
        return []
    try:
        proc = subprocess.run(
            ["openssl", "s_client", "-connect", f"{hostname}:{port}", "-servername", hostname, "-showcerts"],
            input=b"",
            capture_output=True,
            timeout=config.SSL_CHAIN_TIMEOUT_SECONDS,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        logger.info("Certificate chain retrieval unavailable for %s: %s", hostname, exc)
        return []

    output = proc.stdout.decode("utf-8", errors="ignore")
    pem_blocks: list[str] = []
    current: list[str] = []
    in_block = False
    for line in output.splitlines():
        if "-----BEGIN CERTIFICATE-----" in line:
            in_block = True
            current = [line]
        elif "-----END CERTIFICATE-----" in line and in_block:
            current.append(line)
            pem_blocks.append("\n".join(current))
            in_block = False
            current = []
        elif in_block:
            current.append(line)

    chain: list[dict[str, Any]] = []
    for pem in pem_blocks:
        try:
            cert_obj = x509.load_pem_x509_certificate(pem.encode("utf-8"))
            chain.append(
                {
                    "subject": cert_obj.subject.rfc4514_string(),
                    "issuer": cert_obj.issuer.rfc4514_string(),
                }
            )
        except Exception as exc:  # noqa: BLE001 - one bad cert in the chain shouldn't drop the rest
            logger.warning("Could not parse a certificate in the chain for %s: %s", hostname, exc)

    return chain


def _security_grade(tls_version: str, secret_bits: int | None, validity_status: str) -> dict[str, str]:
    """
    Transparent heuristic grade (A+/A/B/C/D/F) — documents its own reasoning
    so the UI can show *why*, rather than presenting an opaque score.
    """
    if validity_status == "expired":
        return {"grade": "F", "reason": "Certificate is expired."}
    if tls_version in {"SSLv2", "SSLv3"} or tls_version == "unknown":
        return {"grade": "F", "reason": f"Negotiated protocol {tls_version} is obsolete/insecure."}
    if tls_version == "TLSv1":
        grade, reason = "F", "TLS 1.0 is deprecated and vulnerable to known downgrade attacks."
    elif tls_version == "TLSv1.1":
        grade, reason = "D", "TLS 1.1 is deprecated; upgrade to TLS 1.2 or newer."
    elif tls_version == "TLSv1.2":
        if secret_bits is not None and secret_bits >= 256:
            grade, reason = "B", "TLS 1.2 with a strong cipher."
        elif secret_bits is not None and secret_bits >= 128:
            grade, reason = "B", "TLS 1.2 with an adequately strong cipher."
        else:
            grade, reason = "C", "TLS 1.2 with a weaker-than-recommended cipher."
    elif tls_version == "TLSv1.3":
        if secret_bits is not None and secret_bits >= 256:
            grade, reason = "A+", "TLS 1.3 negotiated with a strong modern AEAD cipher."
        else:
            grade, reason = "A", "TLS 1.3 negotiated with a modern AEAD cipher."
    else:
        grade, reason = "C", f"Unrecognized protocol version {tls_version}."

    if validity_status == "expiring_soon":
        downgrade = {"A+": "A", "A": "B", "B": "C", "C": "D", "D": "F", "F": "F"}
        grade = downgrade.get(grade, grade)
        reason += " Certificate is expiring soon."

    return {"grade": grade, "reason": reason}


def _attempt_handshake(hostname: str, port: int, timeout: int) -> dict[str, Any]:
    """One TLS connection attempt. Raises the underlying exception on failure."""
    context = ssl.create_default_context()
    with socket.create_connection((hostname, port), timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
            cert = tls_sock.getpeercert()
            cert_der = tls_sock.getpeercert(binary_form=True)
            tls_version = tls_sock.version() or "unknown"
            cipher_name, cipher_protocol, secret_bits = tls_sock.cipher() or (None, None, None)
    return {
        "cert": cert,
        "cert_der": cert_der,
        "tls_version": tls_version,
        "cipher_name": cipher_name,
        "cipher_protocol": cipher_protocol,
        "secret_bits": secret_bits,
    }


def analyze_ssl(hostname: str, port: int = 443) -> dict[str, Any]:
    """
    Returns a rich dict of certificate/handshake details, or {"error": str} on failure.
    Retries once on a bare connection timeout (transient network hiccups are
    common enough on TLS handshakes to be worth one retry before giving up).
    """
    attempts_left = 2 if config.SSL_RETRY_ON_TIMEOUT else 1
    handshake = None
    last_error: str | None = None

    while attempts_left > 0 and handshake is None:
        attempts_left -= 1
        try:
            handshake = _attempt_handshake(hostname, port, config.SSL_TIMEOUT_SECONDS)
        except ssl.SSLCertVerificationError as exc:
            logger.warning("Certificate verification failed for %s: %s", hostname, exc)
            return {"error": f"Certificate verification failed: {exc.verify_message or exc}"}
        except (socket.timeout, TimeoutError):
            last_error = f"Connection to {hostname}:{port} timed out."
            if attempts_left > 0:
                logger.info("SSL handshake with %s timed out, retrying once...", hostname)
                continue
        except (socket.gaierror, ConnectionRefusedError, OSError) as exc:
            return {"error": f"Could not establish a TLS connection to {hostname}:{port}: {exc}"}

    if handshake is None:
        return {"error": last_error or f"Could not establish a TLS connection to {hostname}:{port}."}

    cert = handshake["cert"]
    if not cert:
        return {"error": "No certificate was presented by the server."}

    try:
        expiry = _parse_cert_date(cert["notAfter"])
        not_before = _parse_cert_date(cert["notBefore"])
    except (KeyError, ValueError) as exc:
        return {"error": f"Could not parse certificate validity dates: {exc}"}

    now = datetime.now(timezone.utc)
    days_remaining = (expiry - now).days

    if expiry < now:
        validity_status = "expired"
    elif days_remaining <= 14:
        validity_status = "expiring_soon"
    else:
        validity_status = "valid"

    tls_version = handshake["tls_version"]
    secret_bits = handshake["secret_bits"]

    result: dict[str, Any] = {
        "issuer": _format_dn(cert.get("issuer", ())),
        "subject": _format_dn(cert.get("subject", ())),
        "valid_from": not_before.isoformat(),
        "expiry_date": expiry.isoformat(),
        "days_remaining": days_remaining,
        "tls_version": tls_version,
        "cipher": {"name": handshake["cipher_name"], "protocol": handshake["cipher_protocol"], "bits": secret_bits},
        "validity_status": validity_status,
        "subject_alt_names": [],
        "public_key": None,
        "signature_algorithm": None,
        "serial_number": None,
        "certificate_chain": [],
    }

    # Everything below is bonus enrichment — if it's unavailable or parsing
    # fails, the core result above is still returned complete rather than
    # erroring the whole module out.
    if x509 is not None and handshake["cert_der"]:
        try:
            cert_obj = x509.load_der_x509_certificate(handshake["cert_der"])
            result["subject_alt_names"] = _subject_alt_names(cert_obj)
            result["public_key"] = _public_key_info(cert_obj)
            result["signature_algorithm"] = cert_obj.signature_hash_algorithm.name if cert_obj.signature_hash_algorithm else None
            result["serial_number"] = format(cert_obj.serial_number, "x")
        except Exception as exc:  # noqa: BLE001 - enrichment only, never fatal
            logger.warning("Could not parse extended certificate details for %s: %s", hostname, exc)

    result["certificate_chain"] = _get_certificate_chain(hostname, port)
    result["security_grade"] = _security_grade(tls_version, secret_bits, validity_status)
    result["weak_tls"] = tls_version in _INSECURE_PROTOCOLS or tls_version == "unknown"
    result["weak_cipher"] = secret_bits is not None and secret_bits < 128

    return result
