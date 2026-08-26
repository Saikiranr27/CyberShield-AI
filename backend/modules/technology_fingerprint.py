"""
Technology Fingerprinting module.

Identifies server software, frameworks, and CMS platforms from HTTP
response headers and HTML markup patterns, with version numbers extracted
via regex where the target actually discloses them (e.g. "Server: nginx/1.18.0",
a WordPress generator meta tag, a versioned jQuery filename). No version is
ever guessed — the `version` field is null when the target doesn't disclose one.
"""

from __future__ import annotations

import re
from typing import Any

from config import config
from utils.helpers import fetch_with_fallback
from utils.logger import get_logger

logger = get_logger("modules.technology_fingerprint")

# (technology name, category, lowercase needle to find in headers, optional version regex on the raw header value)
_HEADER_SIGNATURES = [
    ("Nginx", "Web Server", "nginx", r"nginx/([\d.]+)"),
    ("Apache", "Web Server", "apache", r"apache/([\d.]+)"),
    ("Microsoft IIS", "Web Server", "microsoft-iis", r"microsoft-iis/([\d.]+)"),
    ("LiteSpeed", "Web Server", "litespeed", r"litespeed/([\d.]+)"),
    ("Cloudflare", "CDN / Security", "cloudflare", None),
    ("PHP", "Language / Runtime", "php", r"php/([\d.]+)"),
    ("Python", "Language / Runtime", "python", r"python/([\d.]+)"),
    ("Gunicorn", "Backend Framework", "gunicorn", r"gunicorn/([\d.]+)"),
    ("Werkzeug (Flask)", "Backend Framework", "werkzeug", r"werkzeug/([\d.]+)"),
    ("ASP.NET", "Framework", "asp.net", r"asp\.net,?\s*version[:=]?\s*([\d.]+)"),
    ("Express", "Backend Framework", "express", None),
]

# (technology name, category, [needles to search raw HTML for], optional version regex on raw HTML)
_HTML_SIGNATURES = [
    ("WordPress", "CMS", ["wp-content", "wp-includes", 'name="generator" content="wordpress'],
     r'content="wordpress\s+([\d.]+)"'),
    ("Drupal", "CMS", ["drupal.js", "sites/default/files", 'name="generator" content="drupal'],
     r'content="drupal\s+([\d.]+)"'),
    ("Joomla", "CMS", ["/media/jui/", 'name="generator" content="joomla'],
     r'content="joomla!?\s*-?\s*([\d.]+)"'),
    ("React", "Frontend Framework", ["data-reactroot", "react-dom", 'id="root"'], None),
    ("Angular", "Frontend Framework", ["ng-version", "ng-app", "angular.js", "angular.min.js"], r'ng-version="([\d.]+)"'),
    ("Next.js", "Frontend Framework", ["__next_data__", "/_next/static/"], None),
    ("Vue", "Frontend Framework", ["data-v-", "__vue__", "v-cloak"], None),
    ("Bootstrap", "CSS Framework", ["bootstrap.min.css", "bootstrap.bundle", 'class="container-fluid'],
     r"bootstrap[.\-]v?([\d.]+)"),
    ("Tailwind CSS", "CSS Framework", ["tailwindcss", "tailwind.min.css", "tailwind.css"], None),
    ("jQuery", "JS Library", ["jquery.min.js", "jquery.js", "jquery-"], r"jquery[-/]v?([\d.]+)"),
    ("ASP.NET", "Framework", ["__viewstate", "__eventvalidation"], None),
]


def _search_version(text: str, pattern: str | None) -> str | None:
    if not pattern:
        return None
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1) if match else None


def fingerprint(target: str, fetched: tuple | None = None) -> dict[str, Any]:
    """
    Returns:
        {"technologies": [{"name": str, "category": str, "version": str|None, "evidence": str}, ...]}
        or {"error": str} on failure.

    `fetched`, if provided, reuses a response already retrieved by the
    orchestrator (see api/scan.py) instead of issuing a second HTTP request
    when Vulnerability Scanner is also selected. Still independently usable.
    """
    if fetched is not None:
        response, _scheme, _https, error = fetched
    else:
        response, _scheme, _https, error = fetch_with_fallback(
            target, config.HTTP_TIMEOUT_SECONDS, config.HTTP_USER_AGENT
        )
    if response is None:
        return {"error": error}

    headers_raw = "; ".join(f"{k}: {v}" for k, v in response.headers.items())
    headers_blob = headers_raw.lower()
    html_raw = (response.text or "")[:200_000]  # cap to avoid scanning huge pages
    html_blob = html_raw.lower()

    found: dict[str, dict[str, Any]] = {}

    for name, category, needle, version_pattern in _HEADER_SIGNATURES:
        if needle in headers_blob:
            found[name] = {
                "name": name,
                "category": category,
                "version": _search_version(headers_raw, version_pattern),
                "evidence": "HTTP response headers",
            }

    for name, category, needles, version_pattern in _HTML_SIGNATURES:
        for needle in needles:
            if needle in html_blob:
                found[name] = {
                    "name": name,
                    "category": category,
                    "version": _search_version(html_raw, version_pattern),
                    "evidence": "HTML markup pattern",
                }
                break

    # Express implies a Node.js backend — a well-established, accurate inference,
    # not a guess (Express only runs on Node.js).
    if "Express" in found:
        found.setdefault("Node.js", {"name": "Node.js", "category": "Language / Runtime", "version": None, "evidence": "Inferred from Express framework"})

    # X-Powered-By is a strong, explicit signal when present — surface it verbatim too.
    powered_by = response.headers.get("X-Powered-By")
    if powered_by and powered_by not in found:
        found[powered_by] = {
            "name": powered_by,
            "category": "Declared (X-Powered-By)",
            "version": None,
            "evidence": "HTTP response headers",
        }

    return {"technologies": sorted(found.values(), key=lambda t: t["name"])}
