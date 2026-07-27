## Objectif

Transformer `/guide-plages-hyeres` en moteur de blog alimenté par des fichiers Markdown versionnés dans le dépôt GitHub. Aucune base de données, aucune authentification, aucune API externe, aucun coût récurrent : les articles sont lus **au moment du build** par Vite et rendus en SSR.

## Contraintes respectées

- Articles : `src/content/blog/*.md`
- Images : `public/images/blog/`
- `/guide-plages-hyeres` conserve **exactement** son URL, sans doublon sous une seconde adresse
- Identité graphique strictement identique (hero, label GUIDE HYÈRES, titre, chapô, retour, sections, CTA, bloc Nid d'Or, header/footer, responsive)

---

## Étape 1 — Moteur de contenu

**`src/lib/blog.ts`** (nouveau)
- Chargement des articles via `import.meta.glob("../content/blog/*.md", { query: "?raw", eager: true })` → détection automatique au build, compatible Worker Cloudflare (aucun accès disque à l'exécution).
- Parseur de front matter maison (~40 lignes, pas de dépendance Node) gérant chaînes, booléens, dates et listes `[]` / `- item`.
- Champs supportés : `title, seoTitle, description, slug, path, excerpt, date, updatedAt, author, category, tags[], featuredImage, featuredImageAlt, featuredImageCaption, canonical, focusKeyword, draft, noindex, relatedPosts[], ctaTitle, ctaText, ctaLabel, ctaUrl`.
- Valeurs par défaut sûres : `path` déduit du `slug`, `slug` déduit du nom de fichier, `draft: false`, `author: "Joëlle"`.
- Exclusion des `draft: true` en production (`import.meta.env.PROD`) — visibles uniquement en preview de développement.
- Exports : `getAllPosts()`, `getPostByPath()`, `getRelatedPosts()`, `formatFrenchDate()`, `readingTime()` (200 mots/min).

**`src/lib/markdown.ts`** (nouveau)
- `marked` configuré en GFM : paragraphes, H2/H3, gras, italique, listes, tableaux, citations, liens internes/externes, images, légendes, séparateurs.
- **Sécurité** : le HTML brut du Markdown est neutralisé (renderers `html` bloc et inline désactivés) → aucun `<script>`, `onerror`, `javascript:` exécutable. Les URLs de liens et images sont validées (`http`, `https`, `/`, `#` uniquement).
- Identifiants automatiques sur H2/H3 (slugs accentués normalisés, dédoublonnés), extraction du sommaire, `target="_blank" rel="noopener"` sur les liens externes, images enveloppées dans `<figure>` + `<figcaption>` quand un titre est fourni.

## Étape 2 — Template d'article

**`src/components/blog/article-layout.tsx`** (nouveau) — reprise **au pixel** du JSX actuel de `guide-plages-hyeres.tsx` : header sticky (logo + bouton Réserver doré), hero image plein écran avec dégradé et pastille label, H1 `font-display`, chapô, lien « Retour au studio », corps de l'article, CTA `bg-deep`, bloc final, footer. Ajouts intégrés dans le même style : fil d'Ariane, date française + date de mise à jour, temps de lecture, sommaire cliquable, articles associés.

**`src/styles.css`** (modifié) — ajout d'une classe `.prose-nid` utilisant les tokens existants (Fraunces pour les titres, `text-muted-foreground`, bordures dorées sur les citations, tableaux responsives). Aucun token nouveau, aucune couleur en dur.

## Étape 3 — Routage

- **`src/routes/$.tsx`** (nouveau) — route splat racine qui résout le `path` du front matter. Permet `/guide-porquerolles`, `/que-faire-hyeres`, `/visiter-hyeres-3-jours` sans créer un fichier de route par article. Les routes existantes (`/`, `/admin`, `/sitemap.xml`, `/api/*`) restent prioritaires ; si aucun article ne correspond, `notFound()` → page 404 actuelle inchangée.
- **`src/routes/guide-plages-hyeres.tsx`** (supprimé) — son contenu part dans le Markdown ; l'URL est reprise par le splat, donc **identique, sans redirection ni duplication**.
- `head()` généré depuis le front matter : `seoTitle` (ou `title`), description, og:title/description/type=article/url, og:image et twitter:image en **URL absolue** (correction du bug actuel où le chemin était relatif), canonical auto-référencé (ou `canonical` du front matter), `noindex` si demandé ou si brouillon, JSON-LD `Article` + `BreadcrumbList`.

## Étape 4 — Contenu

- **`src/content/blog/guide-plages-hyeres.md`** (nouveau) — contenu actuel repris **mot pour mot** (chapô, 4 plages avec distances et mots-clés, CTA, bloc « Pourquoi choisir Le Nid d'Or »).
- **`public/images/blog/guide-plages-hyeres.jpg`** (nouveau) — copie de l'image hero actuelle, servie depuis `public/`.
- **`src/content/blog/exemple-article-test.md`** (nouveau) — article de démonstration en `draft: true`, servant aussi de modèle de front matter commenté.
- **`src/content/blog/README.md`** (nouveau) — mode d'emploi : créer un `.md`, déposer l'image dans `public/images/blog/`, commit GitHub → publication automatique au build.

## Étape 5 — Sitemap

**`src/routes/sitemap[.]xml.ts`** (modifié) — `/` en statique puis boucle sur `getAllPosts()` (brouillons et `noindex` exclus), avec `lastmod` uniquement quand `updatedAt` ou `date` est renseigné dans le front matter. `public/robots.txt` inchangé.

## Dépendances

- `marked` — pur JavaScript, compatible Worker, ~35 ko. Seule dépendance ajoutée.
- Pas de `gray-matter` (dépend de Buffer/js-yaml, mal adapté au runtime Worker) → parseur maison.

## Prérendu

Aucun prérendu statique à activer : l'application est déjà en SSR sur Worker, chaque article est servi en HTML complet et indexable. Les Markdown étant inlinés au build, la latence reste négligeable. Activer le prérendu de TanStack Start générerait un sitemap statique masquant la route serveur existante.

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Régression visuelle sur `/guide-plages-hyeres` | Captures Playwright avant/après en desktop et mobile |
| Perte de texte à la conversion | Reprise mot pour mot + relecture du diff |
| Front matter mal formé cassant le build | Parsing tolérant + valeurs par défaut, article ignoré avec avertissement plutôt que crash |
| Route splat interceptant une URL légitime | Les routes déclarées sont prioritaires ; `notFound()` sinon |
| HTML injecté dans un Markdown | HTML brut neutralisé, protocoles d'URL validés |

## Vérifications avant livraison

1. `/guide-plages-hyeres` rendu identique à l'actuel (desktop + mobile).
2. L'article de test en `draft: true` renvoie 404 en production et est absent du sitemap.
3. `/`, `/admin`, `/sitemap.xml`, `/api/*` et la page 404 fonctionnent toujours.
4. Build de production sans erreur.
5. Liste finale des fichiers créés et modifiés.
