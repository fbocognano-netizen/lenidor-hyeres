## Diagnostic

Deux problèmes distincts sur la lightbox plein écran :

### 1. Cadrage cassé (photo « zoomée vers le haut »)

Dans `src/components/lightbox.tsx`, la scène est un conteneur `flex-1` contenant directement un `<img class="max-h-full max-w-full object-contain">`. Piège flexbox classique : par défaut un enfant flex a `min-height: auto`, donc `max-h-full` ne peut **pas** rétrécir l'image sous sa taille intrinsèque. Résultat : sur desktop en écran large, une photo portrait haute résolution déborde vers le bas ; on ne voit que le haut, la barre du compteur passe par-dessus, et le reste est masqué sous la caption/miniatures.

C'est le vrai coupable, pas la qualité source.

### 2. Impression de pixelisation

L'image affichée fait souvent plus large que sa résolution native (les photos Airbnb migrées font ~1280 px). En plein écran 1920 px, le navigateur upscale → flou.

## Correctifs

### a) Cadrage — fix structurel dans `src/components/lightbox.tsx`

Remplacer la scène par un wrapper qui garantit un cadre borné :

- Ajouter `min-h-0 min-w-0` sur la scène `flex-1` (débloque `max-h-full`).
- Envelopper l'`<img>` dans un `<div class="relative flex-1 min-h-0 w-full flex items-center justify-center">` et donner à l'image `class="block h-full w-full object-contain"` (au lieu de `max-h-* max-w-*`). `object-contain` gère seul le ratio sans jamais dépasser le cadre.
- Réserver explicitement la place de la caption + miniatures pour qu'elles ne mangent pas la zone photo (les mettre en `shrink-0`).
- Ajouter `overscroll-contain` et retirer le padding latéral trop généreux sur desktop pour laisser l'image respirer.

Résultat : la photo tient toujours pile dans l'espace libre entre la barre du haut et les miniatures, centrée, sans découpe.

### b) Netteté — servir la bonne taille

Améliorer la route de streaming `src/routes/api/public/gallery/$name.ts` pour :

- Ajouter un `Content-Length` et un `ETag` (meilleur cache navigateur, évite le re-download entre vignette et plein écran).
- Documenter que les images doivent être uploadées en ≥ 2000 px de large côté long (ajouté en note dans l'onglet Photos de `/admin`).

Note : pas de redimensionnement serveur (sharp/canvas ne tournent pas sur le runtime edge — cf. contraintes du projet). La bonne pratique reste : uploader des originaux nets.

### c) Bonus UX pendant qu'on y est

- Ajouter un `loading="eager"` + `decoding="async"` sur l'image principale et un léger fondu entre deux photos.
- Sur desktop, cliquer hors de l'image ferme la lightbox (déjà en place) — vérifier que ça ne se déclenche pas par erreur sur les flèches.

## Fichiers modifiés

- `src/components/lightbox.tsx` — refonte de la structure du stage (fix principal).
- `src/routes/api/public/gallery/$name.ts` — headers cache/ETag.
- `src/routes/admin.tsx` — courte note « uploadez des photos ≥ 2000 px » dans l'onglet Photos.

## Détails techniques

Nouvelle structure JSX (schéma) :

```text
<div fixed inset-0 flex flex-col>
  <TopBar shrink-0 />
  <div flex-1 min-h-0 min-w-0 relative flex items-center justify-center>
     <img h-full w-full object-contain />
     <PrevBtn absolute /> <NextBtn absolute />
  </div>
  <Caption shrink-0 />
  <Thumbnails shrink-0 />
</div>
```

Le `min-h-0` sur la zone `flex-1` est la clé — sans lui, `object-contain` ne peut jamais rétrécir sous la taille intrinsèque de l'image.

## Ce qui change pour toi

- Toute photo (portrait, paysage, carrée) s'affiche entièrement à l'écran, centrée, sans coupe.
- Moins de flou visible car cache mieux géré et image jamais étirée au-delà de son ratio.
- Consigne simple : upload en haute résolution (≥ 2000 px) pour un rendu net sur grands écrans.
