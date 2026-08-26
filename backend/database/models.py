"""
Database schema and typed record definitions for CyberSentinel AI.

SQLite is used as a lightweight embedded store (see database/database.py).
This module only defines *shape* — the DDL and the dataclass used to move
scan records between the DB layer and the API layer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

CREATE_SCANS_TABLE = """
CREATE TABLE IF NOT EXISTS scans (
    scan_id         TEXT PRIMARY KEY,
    target          TEXT NOT NULL,
    timestamp       TEXT NOT NULL,
    modules         TEXT NOT NULL,   -- JSON-encoded list[str]
    results         TEXT NOT NULL,   -- JSON-encoded dict (raw per-module output)
    risk_score      INTEGER NOT NULL,
    target_info     TEXT NOT NULL DEFAULT '{}',  -- JSON-encoded dict
    findings        TEXT NOT NULL DEFAULT '[]',  -- JSON-encoded list[dict]
    recommendations TEXT NOT NULL DEFAULT '[]',  -- JSON-encoded list[dict]
    scan_meta       TEXT NOT NULL DEFAULT '{}'   -- JSON-encoded dict (timing, scanner version, command)
);
"""

CREATE_INDEX_TIMESTAMP = """
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans (timestamp DESC);
"""

# Columns added after the initial release, applied via ALTER TABLE in
# database.py's migration step for anyone upgrading with an existing
# cybersentinel.db — new installs get them straight from CREATE_SCANS_TABLE.
MIGRATION_COLUMNS: dict[str, str] = {
    "target_info": "TEXT NOT NULL DEFAULT '{}'",
    "findings": "TEXT NOT NULL DEFAULT '[]'",
    "recommendations": "TEXT NOT NULL DEFAULT '[]'",
    "scan_meta": "TEXT NOT NULL DEFAULT '{}'",
}


@dataclass
class ScanRecord:
    """In-memory representation of a single row in the `scans` table."""

    scan_id: str
    target: str
    timestamp: str
    modules: list[str] = field(default_factory=list)
    results: dict[str, Any] = field(default_factory=dict)
    risk_score: int = 0
    target_info: dict[str, Any] = field(default_factory=dict)
    findings: list[dict[str, Any]] = field(default_factory=list)
    recommendations: list[dict[str, Any]] = field(default_factory=list)
    scan_meta: dict[str, Any] = field(default_factory=dict)

    def to_summary_dict(self) -> dict[str, Any]:
        """Compact shape used by GET /api/history (no full results payload)."""
        return {
            "scan_id": self.scan_id,
            "target": self.target,
            "timestamp": self.timestamp,
            "modules": self.modules,
            "risk_score": self.risk_score,
        }

    def to_full_dict(self) -> dict[str, Any]:
        """Full shape used by GET /api/results/<scan_id> and POST /api/scan."""
        return {
            "scan_id": self.scan_id,
            "target": self.target,
            "timestamp": self.timestamp,
            "modules": self.modules,
            "results": self.results,
            "risk_score": self.risk_score,
            "target_info": self.target_info,
            "findings": self.findings,
            "recommendations": self.recommendations,
            "scan_meta": self.scan_meta,
        }
