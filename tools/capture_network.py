from __future__ import annotations

import argparse
import urllib.parse

from .source_audit_common import fetch, json_dump, now_iso, parse_html


def capture(url: str) -> dict:
    page = fetch(url)
    parser = parse_html(page["body"]) if page["body"] else None
    requests = [
        {
            "kind": "document",
            "url": page["url"],
            "http_status": page["http_status"],
            "content_type": page["content_type"],
            "body_sha256": page["body_sha256"],
        }
    ]
    if parser:
        for src in parser.scripts:
            script = fetch(urllib.parse.urljoin(page["url"], src))
            requests.append(
                {
                    "kind": "script",
                    "url": script["url"],
                    "http_status": script["http_status"],
                    "content_type": script["content_type"],
                    "body_sha256": script["body_sha256"],
                    "candidate_api_terms": [
                        term
                        for term in ["fetch(", "axios", "XMLHttpRequest", "/api/", "/graphql", "events", "agenda", "ajax"]
                        if term.lower() in script["body"].lower()
                    ],
                }
            )
    return {"source_url": url, "tested_at": now_iso(), "requests": requests}


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture a lightweight reproducible request inventory.")
    parser.add_argument("url")
    args = parser.parse_args()
    json_dump(capture(args.url))


if __name__ == "__main__":
    main()
