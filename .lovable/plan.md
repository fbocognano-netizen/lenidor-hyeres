# Rendre le blog visible (UX) et bien maillé (SEO)

Aujourd'hui `/guides-hyeres` n'est atteignable que par une petite ligne dans le bas de page ; la barre de navigation ne pointe que vers l'article « Plages », et sur mobile la navigation disparaît complètement (`hidden md:flex`) — donc aucun accès au blog depuis un téléphone.

## 1. Navigation (le plus gros gain UX)

- Remplacer le lien « Plages » de la barre par **« Guides »** → `/guides-hyeres` (la page plages reste accessible depuis le listing et depuis la section dédiée de l'accueil).
- Ajouter un **menu mobile** (bouton hamburger + panneau plein écran) reprenant les mêmes entrées : Le studio, Photos, Équipements, Le lieu, Guides, puis le bouton Réserver. Actuellement rien n'est cliquable sur mobile hors du bouton Réserver.
- Marquer le lien actif (`activeProps`) pour que l'utilisateur sache où il est.

## 2. Bloc « Guides » sur l'accueil

La section actuelle « guide des plages » sur l'accueil ne renvoie que vers un article. La transformer en petit aperçu du blog :

- Titre : *Nos guides de Hyères*, chapô en une phrase.
- 3 cartes (les 3 articles les plus récents, via `getPublishedPosts()`) avec image, catégorie, titre, temps de lecture.
- Bouton secondaire « Voir tous les guides » → `/guides-hyeres`.

Cela envoie du jus de lien depuis la page la plus forte du site vers le blog, et donne une raison de rester sur le site aux visiteurs qui ne réservent pas tout de suite.

## 3. Retour vers la conversion depuis le blog

- Sur `/guides-hyeres` et sur chaque article, garder un lien clair « Le studio » / « Réserver » vers l'accueil (le CTA existe déjà dans l'article ; on l'ajoute en tête du listing).
- Ajouter le lien « Guides de Hyères » dans le bloc principal du footer, pas seulement dans la ligne de copyright.

## 4. SEO

- Fil d'Ariane déjà en place sur les articles → l'ajouter aussi sur `/guides-hyeres` (visuellement, le JSON-LD existe déjà).
- Vérifier que `/guides-hyeres` et chaque article figurent bien au sitemap (le listing y est ; contrôler que tous les articles publiés sont générés dynamiquement).
- Conserver les URLs actuelles des articles (`/guide-plages-hyeres`, etc.) : les déplacer sous `/guides-hyeres/...` casserait l'indexation déjà acquise pour un gain marginal.
- Ajouter le lien RSS (`/rss.xml`) dans le `<head>` de `__root.tsx` (`rel="alternate"`) et un lien discret en bas du listing.

## Détails techniques

- `src/routes/index.tsx` : composant `Nav` (menu mobile + lien Guides), section `BeachesGuide` remplacée par un `GuidesTeaser` alimenté par `getPublishedPosts()` dans le loader de la route, `Footer` (lien guides).
- `src/routes/guides-hyeres.tsx` : fil d'Ariane visible, CTA retour studio, lien RSS.
- `src/routes/__root.tsx` : `<link rel="alternate" type="application/rss+xml">`.
- Aucun changement de données ni de backend.
