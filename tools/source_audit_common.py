from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from typing import Any


USER_AGENT = "CodexSourceAudit/1.0 (+https://openai.com; respectful source discovery)"
STANDARD_PATHS = [
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/feed",
    "/feed/",
    "/rss",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/events/feed/",
    "/agenda/feed/",
    "/agenda/rss",
    "/agenda/rss.xml",
    "/calendar.ics",
    "/events.ics",
]
EVENT_WORDS = re.compile(
    r"\b(agenda|event|evenement|événement|spectacle|concert|festival|exposition|animation|sortir|date|lieu)\b",
    re.IGNORECASE,
)


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def _fetch_once(url: str, timeout: int, context: ssl.SSLContext | None, tls_verified: bool) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        body = response.read(1_000_000)
        return {
            "url": response.geturl(),
            "requested_url": url,
            "http_status": response.status,
            "content_type": response.headers.get("content-type", ""),
            "headers": dict(response.headers.items()),
            "body": body.decode(response.headers.get_content_charset() or "utf-8", errors="replace"),
            "body_sha256": hashlib.sha256(body).hexdigest(),
            "tls_verified": tls_verified,
            "error": None,
        }


def fetch(url: str, timeout: int = 20) -> dict[str, Any]:
    try:
        return _fetch_once(url, timeout, None, True)
    except urllib.error.HTTPError as exc:
        body = exc.read(200_000)
        return {
            "url": exc.geturl(),
            "requested_url": url,
            "http_status": exc.code,
            "content_type": exc.headers.get("content-type", "") if exc.headers else "",
            "headers": dict(exc.headers.items()) if exc.headers else {},
            "body": body.decode(exc.headers.get_content_charset() or "utf-8", errors="replace") if exc.headers else "",
            "body_sha256": hashlib.sha256(body).hexdigest(),
            "tls_verified": True,
            "error": str(exc),
        }
    except urllib.error.URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" in str(exc.reason):
            try:
                return _fetch_once(url, timeout, ssl._create_unverified_context(), False)
            except Exception as retry_exc:  # noqa: BLE001 - audit tooling must report retry failure.
                return {
                    "url": url,
                    "requested_url": url,
                    "http_status": None,
                    "content_type": "",
                    "headers": {},
                    "body": "",
                    "body_sha256": None,
                    "tls_verified": False,
                    "error": f"{exc}; retry_without_tls_verification_failed: {retry_exc}",
                }
        return {
            "url": url,
            "requested_url": url,
            "http_status": None,
            "content_type": "",
            "headers": {},
            "body": "",
            "body_sha256": None,
            "tls_verified": True,
            "error": str(exc),
        }
    except Exception as exc:  # noqa: BLE001 - audit tooling must report any network failure.
        return {
            "url": url,
            "requested_url": url,
            "http_status": None,
            "content_type": "",
            "headers": {},
            "body": "",
            "body_sha256": None,
            "tls_verified": True,
            "error": str(exc),
        }


def same_origin_url(base_url: str, href: str) -> str | None:
    absolute = urllib.parse.urljoin(base_url, href)
    base = urllib.parse.urlparse(base_url)
    parsed = urllib.parse.urlparse(absolute)
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.netloc != base.netloc:
        return None
    return urllib.parse.urlunparse(parsed._replace(fragment=""))


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self.scripts: list[str] = []
        self.json_ld: list[str] = []
        self._in_json_ld = False
        self._json_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {name.lower(): value or "" for name, value in attrs}
        if tag == "a" and attr.get("href"):
            self.links.append({"href": attr["href"], "text": ""})
        elif tag == "link" and attr.get("href"):
            self.links.append(
                {
                    "href": attr["href"],
                    "rel": attr.get("rel", ""),
                    "type": attr.get("type", ""),
                    "title": attr.get("title", ""),
                }
            )
        elif tag == "script":
            if attr.get("src"):
                self.scripts.append(attr["src"])
            if attr.get("type", "").lower() == "application/ld+json":
                self._in_json_ld = True
                self._json_buffer = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._json_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self.json_ld.append("".join(self._json_buffer).strip())
            self._in_json_ld = False
            self._json_buffer = []


def parse_html(html: str) -> LinkParser:
    parser = LinkParser()
    parser.feed(html)
    return parser


def classify_xml(body: str, content_type: str) -> str | None:
    sample = body.lstrip()[:500].lower()
    if "rss" in content_type or sample.startswith("<rss"):
        return "rss"
    if "atom" in content_type or "<feed" in sample:
        return "atom"
    try:
        root = ET.fromstring(body[:200_000])
    except ET.ParseError:
        return None
    name = root.tag.lower().split("}")[-1]
    if name == "rss":
        return "rss"
    if name == "feed":
        return "atom"
    if name in {"urlset", "sitemapindex"}:
        return "sitemap"
    return None


def feed_contains_events(body: str) -> bool:
    return bool(EVENT_WORDS.search(body[:80_000]))


def json_dump(data: Any) -> None:
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
    print()
