import { getPublishedPosts } from "@/lib/blog";

export interface GuideSearchItem {
  slug: string;
  path: string;
  title: string;
  cardTitle: string;
  excerpt: string;
  category: string;
  searchText: string;
}

export interface GuideSearchResult extends GuideSearchItem {
  score: number;
  snippet: string;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSnippet(text: string, query: string): string {
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index < 0) {
    return text.length > 150 ? `${text.slice(0, 147).trimEnd()}...` : text;
  }

  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + normalizedQuery.length + 90);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function getGuideSearchItems(): GuideSearchItem[] {
  return getPublishedPosts().map((post) => {
    const bodyText = textFromHtml(post.html);
    const title = post.cardTitle || post.title;
    return {
      slug: post.slug,
      path: post.path,
      title: post.title,
      cardTitle: title,
      excerpt: post.excerpt || post.description,
      category: post.category,
      searchText: [
        title,
        post.title,
        post.description,
        post.excerpt,
        post.category,
        post.tags.join(" "),
        bodyText,
      ]
        .filter(Boolean)
        .join(" "),
    };
  });
}

export function searchGuides(query: string, items = getGuideSearchItems()): GuideSearchResult[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  if (terms.length === 0) return [];

  return items
    .map((item) => {
      const title = normalize(`${item.cardTitle} ${item.title}`);
      const category = normalize(item.category);
      const excerpt = normalize(item.excerpt);
      const body = normalize(item.searchText);
      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (category.includes(term)) score += 5;
        if (excerpt.includes(term)) score += 4;
        if (body.includes(term)) score += 1;
      }

      if (title.includes(normalizedQuery)) score += 20;
      if (excerpt.includes(normalizedQuery)) score += 8;
      if (body.includes(normalizedQuery)) score += 2;

      return {
        ...item,
        score,
        snippet: makeSnippet(item.searchText, query),
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.cardTitle.localeCompare(b.cardTitle, "fr"))
    .slice(0, 8);
}
