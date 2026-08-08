from __future__ import annotations

import argparse
import urllib.parse

from .source_audit_common import STANDARD_PATHS, fetch, json_dump, now_iso, parse_html


NEEDLES = [
    "api",
    "graphql",
    "ajax",
    "json",
    "feed",
    "rss",
    "atom",
    "ical",
    "ics",
    "event",
    "agenda",
    "wp-json",
    "views/ajax",
    "load-more",
    "page=",
    "offset=",
    "openagenda",
    "apidae",
    "sitra",
    "intramuros",
]


def audit(url: str) -> dict:
    parsed = urllib.parse.urlparse(url)
    root = f"{parsed.scheme}://{parsed.netloc}"
    page = fetch(url)
    parser = parse_html(page["body"]) if page["body"] else None
    body_lower = page["body"].lower()
    standard_tests = []
    for path in STANDARD_PATHS:
        tested = fetch(urllib.parse.urljoin(root, path))
        standard_tests.append(
            {
                "url": tested["url"],
                "requested_url": tested["requested_url"],
                "http_status": tested["http_status"],
                "content_type": tested["content_type"],
                "body_sha256": tested["body_sha256"],
                "error": tested["error"],
            }
        )

    scripts = []
    if parser:
        for src in parser.scripts:
            script_url = urllib.parse.urljoin(page["url"], src)
            script = fetch(script_url)
            scripts.append(
                {
                    "url": script["url"],
                    "http_status": script["http_status"],
                    "content_type": script["content_type"],
                    "matched_terms": sorted({needle for needle in NEEDLES if needle in script["body"].lower()}),
                }
            )

    return {
        "source_url": url,
        "tested_at": now_iso(),
        "page": {
            "url": page["url"],
            "http_status": page["http_status"],
            "content_type": page["content_type"],
            "body_sha256": page["body_sha256"],
            "matched_terms": sorted({needle for needle in NEEDLES if needle in body_lower}),
            "json_ld_blocks": len(parser.json_ld) if parser else 0,
            "alternate_links": [
                link
                for link in (parser.links if parser else [])
                if "alternate" in link.get("rel", "").lower()
            ],
        },
        "standard_path_tests": standard_tests,
        "scripts": scripts,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit one event source page.")
    parser.add_argument("url")
    args = parser.parse_args()
    json_dump(audit(args.url))


if __name__ == "__main__":
    main()
