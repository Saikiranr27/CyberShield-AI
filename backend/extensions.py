"""
Shared Flask extension instances.

Kept separate from app.py so blueprints (api/scan.py) can import and use
`limiter` to decorate specific routes without a circular import back to
the app factory.
"""

from __future__ import annotations

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import config

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[config.RATELIMIT_DEFAULT],
    storage_uri=config.RATELIMIT_STORAGE_URI,
    enabled=config.RATELIMIT_ENABLED,
)
