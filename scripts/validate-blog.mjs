import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Blog validation — runs before every production build.
 * Published articles: a problem is a hard error and stops the build.
 * Drafts: problems are warnings only.
 */

const ROOT = resolve(process.cwd());
const CONTENT_DIR = join(ROOT, "src/content/blog");
const PUBLIC_DIR = join(ROOT, "public");
const SITE_URL = "https://lenidor-hyeres.fr";

/** Static routes an article may link to. */
const STATIC_ROUTES = new Set(["/", "/guides-hyeres", "/rss.xml", "/sitemap.xml", "/robots.txt"]);

const errors = [];
const warnings = [];

function stripQuotes(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseFrontMatter(raw) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const [, block, body] = match;
  const data = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith("[")) {
      const inner = value.replace(/^\[/, "").replace(/\]$/, "");
      data[kv[1]] = inner.trim() ? inner.split(",").map(stripQuotes).filter(Boolean) : [];
      continue;
    }
    value = stripQuotes(value);
    data[kv[1]] = value === "true" ? true : value === "false" ? false : value;
  }
  return { data, body };
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const files = existsSync(CONTENT_DIR)
  ? readdirSync(CONTENT_DIR).filter(
      (f) => f.endsWith(".md") && !/^(README|_)/i.test(f),
    )
  : [];

const posts = files.map((file) => {
  const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
  const { data, body } = parseFrontMatter(raw);
  const slug = (data.slug || file.replace(/\.md$/, "")).trim();
  const path = `/${String(data.path || slug).trim().replace(/^\/+|\/+$/g, "")}`;
  return { file, data, body, slug, path, draft: data.draft === true };
});

const knownPaths = new Set([...STATIC_ROUTES, ...posts.map((p) => p.path)]);
const today = new Date().toISOString().slice(0, 10);
const seenPaths = new Map();

for (const post of posts) {
  const report = (message) => {
    const line = `${post.file}: ${message}`;
    if (post.draft) warnings.push(line);
    else errors.push(line);
  };
  const { data } = post;

  for (const field of ["title", "seoTitle", "description"]) {
    if (!String(data[field] ?? "").trim()) report(`champ « ${field} » manquant`);
  }

  const previous = seenPaths.get(post.path);
  if (previous) report(`path « ${post.path} » déjà utilisé par ${previous}`);
  else seenPaths.set(post.path, post.file);

  const canonical = String(data.canonical ?? "").trim();
  if (canonical) {
    const expected = `${SITE_URL}${post.path}`;
    if (!/^https?:\/\//i.test(canonical)) {
      report(`canonical « ${canonical} » doit être une URL absolue`);
    } else if (canonical !== expected && !canonical.startsWith(SITE_URL)) {
      warnings.push(`${post.file}: canonical externe « ${canonical} » (volontaire ?)`);
    }
  }

  const image = String(data.featuredImage ?? "").trim();
  if (!image) report("featuredImage manquante");
  else if (image.startsWith("/") && !existsSync(join(PUBLIC_DIR, image.replace(/^\//, "")))) {
    report(`image introuvable : public${image}`);
  }
  if (!String(data.featuredImageAlt ?? "").trim()) report("featuredImageAlt manquant");

  if (!isValidDate(data.date)) report(`date invalide : « ${data.date ?? ""} »`);
  if (data.updatedAt && !isValidDate(data.updatedAt)) {
    report(`updatedAt invalide : « ${data.updatedAt} »`);
  }
  if (isValidDate(data.date) && data.date > today && !post.draft) {
    warnings.push(`${post.file}: article programmé le ${data.date} — masqué jusqu'à cette date`);
  }

  // Internal links (markdown + front matter CTA)
  const targets = [...post.body.matchAll(/\]\((\/[^)\s]*)/g)].map((m) => m[1]);
  const ctaUrl = String(data.ctaUrl ?? "").trim();
  if (ctaUrl.startsWith("/")) targets.push(ctaUrl);
  for (const target of targets) {
    const clean = target.split("#")[0].replace(/\/+$/, "") || "/";
    if (clean.startsWith("/images/") || clean.startsWith("/api/")) {
      if (clean.startsWith("/images/") && !existsSync(join(PUBLIC_DIR, clean.replace(/^\//, "")))) {
        report(`image liée introuvable : public${clean}`);
      }
      continue;
    }
    if (!knownPaths.has(clean)) report(`lien interne cassé : ${target}`);
  }

  const related = Array.isArray(data.relatedPosts) ? data.relatedPosts : [];
  for (const slug of related) {
    if (!posts.some((p) => p.slug === slug || p.path === `/${slug.replace(/^\//, "")}`)) {
      warnings.push(`${post.file}: relatedPosts « ${slug} » introuvable`);
    }
  }
}

for (const warning of warnings) console.warn(`⚠️  ${warning}`);

if (errors.length) {
  console.error("\n❌ Validation du blog échouée :");
  for (const error of errors) console.error(`   - ${error}`);
  process.exit(1);
}

console.log(
  `✅ Blog validé : ${posts.filter((p) => !p.draft).length} article(s) publié(s), ${posts.filter((p) => p.draft).length} brouillon(s), ${warnings.length} avertissement(s).`,
);
