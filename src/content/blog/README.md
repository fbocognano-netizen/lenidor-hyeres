# Blog — mode d'emploi

Chaque article est un simple fichier Markdown de ce dossier. Aucune base de
données, aucun outil externe.

> **Important — mise en ligne.** Avec l'hébergement Lovable, un commit GitHub
> synchronise le code mais ne garantit pas la mise en ligne immédiate. Après le
> commit : vérifier que la synchronisation GitHub → Lovable est bien passée,
> puis **republier le projet dans Lovable** (bouton Publish → Update). Cette
> republication ne nécessite aucun prompt IA et ne consomme aucun crédit.

## Ajouter un article

1. Déposer l'image principale dans `public/images/blog/mon-image.jpg`.
2. Copier `_template.md` en `src/content/blog/mon-article.md` et remplir le front
   matter (les fichiers commençant par `_` ne sont jamais publiés).
3. Commit + push → l'article est détecté automatiquement au build.
4. Vérifier la synchronisation dans Lovable, puis republier le projet.

## Front matter

```yaml
---
title: "Titre affiché en H1"
seoTitle: "Titre pour Google (60 caractères max)"
description: "Meta description, 155 caractères max."
slug: "mon-article"
path: "/mon-article"          # URL finale, personnalisable
excerpt: "Chapô affiché sous le titre dans le hero."
date: "2026-08-01"
updatedAt: "2026-08-01"
author: "Joëlle"
category: "GUIDE HYÈRES"      # affiché comme label sur le hero
tags: ["porquerolles", "plage"]
featuredImage: "/images/blog/mon-image.jpg"
featuredImageAlt: "Description de l'image pour l'accessibilité"
featuredImageCaption: ""
canonical: ""                 # laisser vide = URL de la page
focusKeyword: "mot-clé principal"
draft: true                   # true = invisible en production
noindex: false
relatedPosts: ["guide-plages-hyeres"]
ctaTitle: "Titre du bloc de réservation"
ctaText: "Texte du bloc."
ctaLabel: "Vérifier les disponibilités"
ctaUrl: ""                    # lien secondaire optionnel
ctaUrlLabel: "En savoir plus" # libellé du lien secondaire
---
```

## Mise en forme supportée

Paragraphes, `##` H2 et `###` H3, **gras**, *italique*, listes à puces et
numérotées, tableaux, citations `>`, liens internes et externes, images avec
légende (`![alt](/chemin.jpg "légende")`) et séparateurs `---`.

Pour éviter les décalages de mise en page, préciser les dimensions connues d'une
image : `![alt](/images/blog/photo.jpg#1200x800 "légende")` → génère
`width="1200" height="800"`.

Le HTML brut écrit dans un Markdown n'est **jamais exécuté** : il est affiché
comme du texte.

## Généré automatiquement

Ancres sur les titres, sommaire cliquable, temps de lecture, dates en français,
fil d'Ariane, articles associés, CTA final, métadonnées SEO, JSON-LD et entrée
de sitemap.

## Brouillons

`draft: true` → l'article est visible en preview de développement mais renvoie
une 404 en production et n'apparaît ni dans `/guides-hyeres`, ni dans
`sitemap.xml`, ni dans `rss.xml`. Idem pour `noindex: true` et pour un article
dont la `date` est dans le futur (publication programmée).

## Validation automatique

`node scripts/validate-blog.mjs` s'exécute avant chaque build. Il vérifie
`title`, `seoTitle`, `description`, l'unicité du `path`, la cohérence de la
`canonical`, l'existence de l'image et de son `alt`, la validité des dates et
les liens internes. Une erreur sur un article **publié** bloque le build ; sur
un **brouillon**, elle ne produit qu'un avertissement.

## Pages générées

- `/guides-hyeres` — liste automatique des articles publiés
- `/rss.xml` — flux RSS des articles publiés
- `/sitemap.xml` — inclut l'accueil, `/guides-hyeres` et chaque article indexable.
  Toutes les entrées déclarent `changefreq: daily` pour demander une mise à jour quotidienne.
