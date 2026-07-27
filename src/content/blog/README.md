# Blog — mode d'emploi

Chaque article est un simple fichier Markdown de ce dossier. Aucune base de
données, aucun outil externe : un `git push` sur GitHub suffit à publier.

## Ajouter un article

1. Déposer l'image principale dans `public/images/blog/mon-image.jpg`.
2. Créer `src/content/blog/mon-article.md` en copiant le front matter ci-dessous.
3. Commit + push → l'article est détecté automatiquement au build.

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

Le HTML brut écrit dans un Markdown n'est **jamais exécuté** : il est affiché
comme du texte.

## Généré automatiquement

Ancres sur les titres, sommaire cliquable, temps de lecture, dates en français,
fil d'Ariane, articles associés, CTA final, métadonnées SEO, JSON-LD et entrée
de sitemap.

## Brouillons

`draft: true` → l'article est visible en preview de développement mais renvoie
une 404 en production et n'apparaît pas dans `sitemap.xml`.
