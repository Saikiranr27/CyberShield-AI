"""
SQLite persistence layer for CyberSentinel AI.

Uses one short-lived connection per operation (safe for Flask's threaded
dev server and simple enough for a single-file SQLite deployment) rather
than a long-lived global connection shared across threads.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Optional

from config import config
from database.models import CREATE_INDEX_TIMESTAMP, CREATE_SCANS_TABLE, MIGRATION_COLUMNS, ScanRecord
from utils.logger import get_logger

logger = get_logger("database")


class Database:
    """Thin wrapper around sqlite3 for the `scans` table."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path or config.DATABASE_PATH
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        self._migrate_schema()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(CREATE_SCANS_TABLE)
            conn.execute(CREATE_INDEX_TIMESTAMP)
        logger.info("Database schema ready at %s", self.db_path)

    def _migrate_schema(self) -> None:
        """
        Backward-compatible migration: adds any columns introduced after the
        initial release (target_info, findings, recommendations) to an
        existing database file that predates them, without touching any
        existing rows/data. New databases already have these columns from
        CREATE_SCANS_TABLE, so this is a no-op for them.
        """
        with self._connect() as conn:
            existing = {row["name"] for row in conn.execute("PRAGMA table_info(scans)").fetchall()}
            for column, ddl_type in MIGRATION_COLUMNS.items():
                if column not in existing:
                    conn.execute(f"ALTER TABLE scans ADD COLUMN {column} {ddl_type}")
                    logger.info("Migrated database: added missing column '%s' to scans table.", column)

    def save_scan(self, record: ScanRecord) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO scans (scan_id, target, timestamp, modules, results, risk_score,
                                    target_info, findings, recommendations, scan_meta)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(scan_id) DO UPDATE SET
                    target = excluded.target,
                    timestamp = excluded.timestamp,
                    modules = excluded.modules,
                    results = excluded.results,
                    risk_score = excluded.risk_score,
                    target_info = excluded.target_info,
                    findings = excluded.findings,
                    recommendations = excluded.recommendations,
                    scan_meta = excluded.scan_meta
                """,
                (
                    record.scan_id,
                    record.target,
                    record.timestamp,
                    json.dumps(record.modules),
                    json.dumps(record.results),
                    record.risk_score,
                    json.dumps(record.target_info),
                    json.dumps(record.findings),
                    json.dumps(record.recommendations),
                    json.dumps(record.scan_meta),
                ),
            )
        logger.info("Saved scan %s for target %s", record.scan_id, record.target)

    def get_scan(self, scan_id: str) -> Optional[ScanRecord]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM scans WHERE scan_id = ?", (scan_id,)
            ).fetchone()
        if row is None:
            return None
        return self._row_to_record(row)

    def get_history(self, limit: int = 50) -> list[ScanRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM scans ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    @staticmethod
    def _row_to_record(row: sqlite3.Row) -> ScanRecord:
        row_keys = row.keys()
        return ScanRecord(
            scan_id=row["scan_id"],
            target=row["target"],
            timestamp=row["timestamp"],
            modules=json.loads(row["modules"]),
            results=json.loads(row["results"]),
            risk_score=row["risk_score"],
            target_info=json.loads(row["target_info"]) if "target_info" in row_keys and row["target_info"] else {},
            findings=json.loads(row["findings"]) if "findings" in row_keys and row["findings"] else [],
            recommendations=json.loads(row["recommendations"]) if "recommendations" in row_keys and row["recommendations"] else [],
            scan_meta=json.loads(row["scan_meta"]) if "scan_meta" in row_keys and row["scan_meta"] else {},
        )


# Module-level singleton used by the API blueprints.
db = Database()
