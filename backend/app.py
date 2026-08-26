"""
CyberSentinel AI backend — Flask application entry point.

Run with:
    python app.py
"""

from __future__ import annotations

from flask import Flask, Response, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from api.history import history_bp
from api.reports import reports_bp
from api.scan import scan_bp
from config import config
from extensions import limiter
from utils.logger import get_logger

logger = get_logger("app")


def create_app() -> Flask:
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})
    limiter.init_app(app)

    app.register_blueprint(scan_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(reports_bp)

    @app.get("/api/health")
    def health() -> tuple[Response, int]:
        return jsonify({"status": "success", "message": "CyberSentinel AI backend is online."}), 200

    # --- Secure headers on every response ------------------------------------
    # A security scanner should practice what it detects: it flags targets
    # missing these same headers (see modules/vulnerability_scanner.py), so
    # its own API responses set the ones that are meaningful for a JSON/PDF
    # API (no CSP here — this isn't serving HTML that renders untrusted
    # content, so a page-content policy doesn't apply the same way).
    @app.after_request
    def set_secure_headers(response: Response) -> Response:
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    # --- Global error handlers --------------------------------------------
    # Every error path returns clean JSON. Stack traces are logged server-side
    # only — never included in the response body.

    @app.errorhandler(404)
    def handle_not_found(_exc: HTTPException) -> tuple[Response, int]:
        return jsonify({"status": "error", "message": "The requested resource was not found."}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(_exc: HTTPException) -> tuple[Response, int]:
        return jsonify({"status": "error", "message": "Method not allowed for this endpoint."}), 405

    @app.errorhandler(400)
    def handle_bad_request(exc: HTTPException) -> tuple[Response, int]:
        return jsonify({"status": "error", "message": exc.description or "Bad request."}), 400

    @app.errorhandler(429)
    def handle_rate_limited(exc: HTTPException) -> tuple[Response, int]:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Too many requests. Please slow down and try again shortly.",
                    "retry_after": getattr(exc, "description", None),
                }
            ),
            429,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException) -> tuple[Response, int]:
        return jsonify({"status": "error", "message": exc.description or "Request failed."}), exc.code or 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception) -> tuple[Response, int]:
        logger.exception("Unhandled exception while processing request")
        return jsonify({"status": "error", "message": "An unexpected server error occurred."}), 500

    logger.info("CyberSentinel AI backend initialized.")
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
