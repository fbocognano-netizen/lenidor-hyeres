import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { absoluteUrl, getPublishedPosts, SITE_URL } from "@/lib/blog";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(date: string): string {
  const parsed = new Date(`${date}T09:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return new Date().toUTCString();
  return parsed.toUTCString();
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = getPublishedPosts();
        const lastBuild = posts[0]?.updatedAt || posts[0]?.date || "";

        const items = posts
          .map((post) => {
            const url = `${SITE_URL}${post.path}`;
            return [
              `    <item>`,
              `      <title>${escapeXml(post.title)}</title>`,
              `      <link>${escapeXml(url)}</link>`,
              `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
              `      <description>${escapeXml(post.excerpt || post.description)}</description>`,
              post.date ? `      <pubDate>${toRfc822(post.date)}</pubDate>` : null,
              post.author ? `      <author>contact@lenidor-hyeres.fr (${escapeXml(post.author)})</author>` : null,
              post.category ? `      <category>${escapeXml(post.category)}</category>` : null,
              post.featuredImage
                ? `      <enclosure url="${escapeXml(absoluteUrl(post.featuredImage))}" type="image/jpeg" />`
                : null,
              `    </item>`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n");

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
          `  <channel>`,
          `    <title>Guides de Hyères — Le Nid d'Or</title>`,
          `    <link>${SITE_URL}/guides-hyeres</link>`,
          `    <description>Plages, Îles d'Or et bonnes adresses à Hyères, par Joëlle du Nid d'Or.</description>`,
          `    <language>fr-FR</language>`,
          `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
          lastBuild ? `    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>` : null,
          items,
          `  </channel>`,
          `</rss>`,
        ]
          .filter(Boolean)
          .join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
