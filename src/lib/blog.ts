import { renderMarkdown, type TocItem } from "./markdown";

export const SITE_URL = "https://lenidor-hyeres.fr";

export interface BlogFrontMatter {
  title: string;
  seoTitle: string;
  description: string;
  slug: string;
  path: string;
  excerpt: string;
  date: string;
  updatedAt: string;
  author: string;
  category: string;
  tags: string[];
  featuredImage: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  canonical: string;
  focusKeyword: string;
  draft: boolean;
  noindex: boolean;
  relatedPosts: string[];
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface BlogPost extends BlogFrontMatter {
  html: string;
  toc: TocItem[];
  readingMinutes: number;
  fileName: string;
}

/* ------------------------------------------------------------------ */
/* Front matter parsing (dependency-free, Worker-safe)                 */
/* ------------------------------------------------------------------ */

function stripQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseInlineList(value: string): string[] {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((item) => stripQuotes(item))
    .filter(Boolean);
}

function parseFrontMatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const [, block, body] = match;
  const data: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;

    const key = kv[1];
    let value = kv[2].trim();

    // Multi-line "- item" list
    if (value === "") {
      const items: string[] = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        items.push(stripQuotes(lines[i + 1].replace(/^\s*-\s+/, "")));
        i += 1;
      }
      data[key] = items.length ? items : "";
      continue;
    }

    if (value.startsWith("[")) {
      data[key] = parseInlineList(value);
      continue;
    }

    value = stripQuotes(value);
    if (value === "true" || value === "false") {
      data[key] = value === "true";
      continue;
    }
    data[key] = value;
  }

  return { data, body };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizePath(value: string, slug: string): string {
  const candidate = value || slug;
  const cleaned = candidate.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${cleaned}`;
}

/* ------------------------------------------------------------------ */
/* Build-time loading                                                  */
/* ------------------------------------------------------------------ */

const modules = import.meta.glob("../content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function buildPost(filePath: string, raw: string): BlogPost | null {
  try {
    const { data, body } = parseFrontMatter(raw);
    const fileName = filePath.split("/").pop() ?? filePath;
    const slug = asString(data.slug) || fileName.replace(/\.md$/, "");
    const title = asString(data.title) || slug;
    const { html, toc, wordCount } = renderMarkdown(body.trim());

    return {
      fileName,
      title,
      seoTitle: asString(data.seoTitle) || title,
      description: asString(data.description),
      slug,
      path: normalizePath(asString(data.path), slug),
      excerpt: asString(data.excerpt) || asString(data.description),
      date: asString(data.date),
      updatedAt: asString(data.updatedAt),
      author: asString(data.author, "Joëlle"),
      category: asString(data.category),
      tags: asList(data.tags),
      featuredImage: asString(data.featuredImage),
      featuredImageAlt: asString(data.featuredImageAlt) || title,
      featuredImageCaption: asString(data.featuredImageCaption),
      canonical: asString(data.canonical),
      focusKeyword: asString(data.focusKeyword),
      draft: data.draft === true,
      noindex: data.noindex === true,
      relatedPosts: asList(data.relatedPosts),
      ctaTitle: asString(data.ctaTitle),
      ctaText: asString(data.ctaText),
      ctaLabel: asString(data.ctaLabel),
      ctaUrl: asString(data.ctaUrl),
      html,
      toc,
      readingMinutes: Math.max(1, Math.round(wordCount / 200)),
    };
  } catch (error) {
    console.warn(`[blog] Article ignoré (front matter invalide) : ${filePath}`, error);
    return null;
  }
}

const ALL_POSTS: BlogPost[] = Object.entries(modules)
  // README.md documents the folder — it is not an article.
  .filter(([filePath]) => !/\/(README|_[^/]*)\.md$/i.test(filePath))
  .map(([filePath, raw]) => buildPost(filePath, raw))

  .filter((post): post is BlogPost => post !== null)
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

/** Drafts are only visible outside of production builds. */
const DRAFTS_VISIBLE = import.meta.env.PROD !== true;

export function getAllPosts(includeDrafts = false): BlogPost[] {
  if (includeDrafts) return ALL_POSTS;
  return ALL_POSTS.filter((post) => !post.draft || DRAFTS_VISIBLE);
}

/** Posts eligible for indexing (sitemap). Drafts and noindex are excluded. */
export function getIndexablePosts(): BlogPost[] {
  return ALL_POSTS.filter((post) => !post.draft && !post.noindex);
}

export function getPostByPath(pathname: string): BlogPost | undefined {
  const normalized = `/${pathname.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return getAllPosts().find((post) => post.path === normalized);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const pool = getAllPosts().filter((p) => p.slug !== post.slug);

  const explicit = post.relatedPosts
    .map((slug) => pool.find((p) => p.slug === slug || p.path === normalizePath(slug, slug)))
    .filter((p): p is BlogPost => Boolean(p));

  if (explicit.length >= limit) return explicit.slice(0, limit);

  const sameCategory = pool.filter(
    (p) => p.category && p.category === post.category && !explicit.includes(p),
  );

  return [...explicit, ...sameCategory].slice(0, limit);
}

const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatFrenchDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return "";
  const [, year, month, day] = match;
  const monthName = FRENCH_MONTHS[Number(month) - 1] ?? "";
  const dayLabel = Number(day) === 1 ? "1er" : String(Number(day));
  return `${dayLabel} ${monthName} ${year}`;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
