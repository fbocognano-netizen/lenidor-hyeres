import { createFileRoute, notFound } from "@tanstack/react-router";

import { ArticleLayout } from "@/components/blog/article-layout";
import { absoluteUrl, getPostByPath, SITE_URL } from "@/lib/blog";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => {
    const splat = (params as { _splat?: string })._splat ?? "";
    const post = getPostByPath(splat);
    if (!post) throw notFound();
    return { post };
  },

  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) {
      return {
        meta: [{ title: "Page introuvable | Le Nid d'Or" }, { name: "robots", content: "noindex" }],
      };
    }

    const url = `${SITE_URL}${post.path}`;
    const canonical = post.canonical ? absoluteUrl(post.canonical) : url;
    const image = post.featuredImage ? absoluteUrl(post.featuredImage) : "";

    return {
      meta: [
        { title: post.seoTitle },
        { name: "description", content: post.description },
        { property: "og:title", content: post.seoTitle },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
        ...(post.draft || post.noindex
          ? [{ name: "robots", content: "noindex, nofollow" }]
          : []),
      ],
      links: [
        { rel: "canonical", href: canonical },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap",
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            ...(image ? { image } : {}),
            url,
            inLanguage: "fr-FR",
            ...(post.date ? { datePublished: post.date } : {}),
            ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
            author: { "@type": "Person", name: post.author || "Joëlle" },
            publisher: {
              "@type": "Organization",
              name: "Le Nid d'Or",
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/images/blog/guide-plages-hyeres.jpg`,
              },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Guides de Hyères",
                item: `${SITE_URL}/guides-hyeres`,
              },
              { "@type": "ListItem", position: 3, name: post.title, item: canonical },
            ],
          }),
        },
      ],
    };
  },

  component: BlogArticleRoute,
});

function BlogArticleRoute() {
  const { post } = Route.useLoaderData();
  return <ArticleLayout post={post} />;
}
