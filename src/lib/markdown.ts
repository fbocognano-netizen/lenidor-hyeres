import { Marked, type Tokens } from "marked";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Slugify a heading into a clean, accent-free anchor id. */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only allow safe URL shapes — blocks javascript:, data:, vbscript: etc. */
function safeUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  const value = href.trim();
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(value)) return value;
  return null;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) && !href.includes("lenidor-hyeres.fr");
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
  wordCount: number;
}

export function renderMarkdown(source: string): RenderResult {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    renderer: {
      // Raw HTML inside markdown is never executed — it is escaped as text.
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(token.raw);
      },

      heading(token: Tokens.Heading) {
        const text = this.parser.parseInline(token.tokens);
        const plain = text.replace(/<[^>]*>/g, "");
        const level = Math.min(Math.max(token.depth, 2), 4);

        let id = slugifyHeading(plain) || "section";
        const seen = used.get(id) ?? 0;
        used.set(id, seen + 1);
        if (seen > 0) id = `${id}-${seen + 1}`;

        if (level === 2 || level === 3) {
          toc.push({ id, text: plain, level });
        }

        return `<h${level} id="${id}" class="scroll-mt-24">${text}</h${level}>\n`;
      },

      link(token: Tokens.Link) {
        const href = safeUrl(token.href);
        const text = this.parser.parseInline(token.tokens);
        if (!href) return text;
        const attrs = isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
        return `<a href="${escapeHtml(href)}"${title}${attrs}>${text}</a>`;
      },

      image(token: Tokens.Image) {
        const href = safeUrl(token.href);
        if (!href) return escapeHtml(token.text ?? "");
        const alt = escapeHtml(token.text ?? "");
        const img = `<img src="${escapeHtml(href)}" alt="${alt}" loading="lazy" decoding="async" />`;
        if (token.title) {
          return `<figure>${img}<figcaption>${escapeHtml(token.title)}</figcaption></figure>`;
        }
        return `<figure>${img}${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`;
      },

      table(token: Tokens.Table) {
        const header = token.header
          .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
          .join("");
        const body = token.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`,
          )
          .join("");
        return `<div class="md-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });

  const html = marked.parse(source, { async: false }) as string;
  const wordCount = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|\-[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return { html, toc, wordCount };
}
