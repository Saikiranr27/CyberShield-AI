"""
History API blueprint.

    GET /api/history?limit=50 - list previously completed scans (summary shape)
"""

from __future__ import annotations

from flask import Blueprint, Response, jsonify, request

from database.database import db
from utils.logger import get_logger

logger = get_logger("api.history")

history_bp = Blueprint("history", __name__)

_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200


@history_bp.route("/api/history", methods=["GET"])
def get_history() -> tuple[Response, int]:
    limit_param = request.args.get("limit", str(_DEFAULT_LIMIT))
    try:
        limit = max(1, min(_MAX_LIMIT, int(limit_param)))
    except ValueError:
        limit = _DEFAULT_LIMIT

    try:
        records = db.get_history(limit=limit)
    except Exception:
        logger.exception("Failed to load scan history")
        return jsonify({"status": "error", "message": "Could not load scan history."}), 500

    return (
        jsonify(
            {
                "status": "success",
                "count": len(records),
                "history": [r.to_summary_dict() for r in records],
            }
        ),
        200,
    )
