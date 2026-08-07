from __future__ import annotations

import argparse
import urllib.parse
import xml.etree.ElementTree as ET
from collections import deque

from .source_audit_common import (
    EVENT_WORDS,
    STANDARD_PATHS,
    classify_xml,
    feed_contains_events,
    fetch,
    json_dump,
    now_iso,
    parse_html,
    same_origin_url,
)


def discover(base_url: str, max_pages: int = 30) -> dict:
    parsed = urllib.parse.urlparse(base_url)
    root = f"{parsed.scheme}://{parsed.netloc}"
    tested: dict[str, dict] = {}
    candidates: set[str] = set()
    pages: set[str] = set()
    queue = deque([base_url, root])

    robots = fetch(urllib.parse.urljoin(root, "/robots.txt"))
    sitemap_urls = []
    if robots["body"]:
        for line in robots["body"].splitlines():
            if line.lower().startswith("sitemap:"):
                sitemap_urls.append(line.split(":", 1)[1].strip())

    for path in STANDARD_PATHS:
        candidates.add(urllib.parse.urljoin(root, path))
    candidates.update(sitemap_urls)

    while queue and len(pages) < max_pages:
        url = queue.popleft()
        if url in pages:
            continue
        response = fetch(url)
        tested[url] = response
        if not response["http_status"] or response["http_status"] >= 400:
            continue
        if "html" not in response["content_type"]:
            continue
        pages.add(url)
        parser = parse_html(response["body"])
        for link in parser.links:
            href = link["href"]
            absolute = same_origin_url(url, href)
            if not absolute:
                continue
            haystack = " ".join([href, link.get("rel", ""), link.get("type", ""), link.get("title", "")])
            if any(token in haystack.lower() for token in ["rss", "feed", "atom", "xml"]):
                candidates.add(absolute)
            if EVENT_WORDS.search(haystack) and absolute not in pages:
                queue.append(absolute)

    for sitemap_url in list(candidates):
        if "sitemap" not in sitemap_url:
            continue
        response = tested.get(sitemap_url) or fetch(sitemap_url)
        tested[sitemap_url] = response
        if response["http_status"] != 200:
            continue
        try:
            root_xml = ET.fromstring(response["body"][:1_000_000])
        except ET.ParseError:
            continue
        for loc in root_xml.iter():
            if loc.tag.lower().endswith("loc") and loc.text:
                if any(token in loc.text.lower() for token in ["rss", "feed", "atom", "agenda", "event"]):
                    candidates.add(loc.text.strip())

    feeds = []
    seen_feeds: set[str] = set()
    for url in sorted(candidates):
        response = tested.get(url) or fetch(url)
        tested[url] = response
        fmt = classify_xml(response["body"], response["content_type"])
        if fmt not in {"rss", "atom"}:
            continue
        if response["url"] in seen_feeds:
            continue
        seen_feeds.add(response["url"])
        feeds.append(
            {
                "url": response["url"],
                "format": fmt,
                "http_status": response["http_status"],
                "content_type": response["content_type"],
                "contains_events": feed_contains_events(response["body"]),
                "last_item_date": None,
            }
        )

    return {
        "domain": parsed.netloc,
        "tested_at": now_iso(),
        "robots_url": urllib.parse.urljoin(root, "/robots.txt"),
        "robots_status": robots["http_status"],
        "pages_scanned": sorted(pages),
        "feeds": feeds,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Discover RSS/Atom feeds for a domain.")
    parser.add_argument("url")
    parser.add_argument("--max-pages", type=int, default=30)
    args = parser.parse_args()
    json_dump(discover(args.url, max_pages=args.max_pages))


if __name__ == "__main__":
    main()
