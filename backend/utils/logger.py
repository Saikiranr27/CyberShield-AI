"""
Centralized logging setup for CyberSentinel AI backend.

Every module calls `get_logger(__name__)` to get a consistently configured
logger that writes to both stdout and a rotating log file, without ever
leaking stack traces to API responses (that boundary is enforced in
app.py's error handlers, not here).
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler

from config import config

_CONFIGURED = False


def _configure_root() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    root = logging.getLogger("cybersentinel")
    root.setLevel(config.LOG_LEVEL)
    root.propagate = False

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    try:
        file_handler = RotatingFileHandler(
            config.LOG_FILE, maxBytes=2_000_000, backupCount=3
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)
    except OSError:
        # File system may be read-only in some deployment environments —
        # console logging alone is an acceptable degradation.
        root.warning("Could not attach file log handler; logging to console only.")

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger under the shared 'cybersentinel' root logger."""
    _configure_root()
    return logging.getLogger(f"cybersentinel.{name}")
