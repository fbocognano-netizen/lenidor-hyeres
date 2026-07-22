## Objectif

Tu ajoutes/retires des photos quand tu veux, **sans code, sans build, sans consommer de tokens**. Le site les affiche automatiquement à la prochaine visite.

## Solution : bucket Storage `gallery` sur Lovable Cloud

1. Je crée un bucket public `gallery` sur Lovable Cloud (backend déjà en place).
2. J'y uploade les **5 photos actuelles** pour amorcer.
3. Le site liste dynamiquement les photos du bucket à chaque chargement (via un `serverFn` `listGalleryPhotos` avec cache 5 min) et les affiche dans la galerie + la lightbox.
4. **Pour toi ensuite** : tu ouvres l'onglet **Photos** que j'ajoute dans `/admin`, tu glisses-déposes tes photos, tu peux les réordonner et supprimer. Rien d'autre à faire. Zéro token, zéro attente de build.

### Convention pour le tri

Les fichiers sont triés alphabétiquement. L'admin les nomme automatiquement `010-nom.jpg`, `020-nom.jpg`, etc. — tu peux glisser-déposer dans l'ordre voulu, je re-numérote côté serveur. La première photo devient l'image principale de la grille.

### Métadonnées

Un champ `alt` (légende accessibilité + SEO) est stocké dans les **métadonnées Storage** de chaque fichier — pas besoin de table SQL. Tu peux éditer l'`alt` depuis l'admin. Si vide, on utilise un fallback générique.

## UX Lightbox (rappel de la proposition validée)

- Clic sur une photo → ouverture plein écran, fond `deep/95`, animation `fade-in` + `scale-in`.
- Flèches ← → discrètes (rondes, semi-transparentes), toujours visibles sur mobile.
- **Swipe** tactile gauche/droite sur mobile.
- Clavier ← → et `Échap`.
- Compteur « 3 / 12 » en bas, bouton X en haut à droite.
- Précharge photo suivante/précédente.
- Miniatures scrollables en bas (utile dès 8+ photos).
- Overlay **« Voir les N photos »** sur la grille.

## Implémentation technique

**Backend**
- `supabase--storage_create_bucket` : bucket `gallery` public.
- Politique RLS `storage.objects` : `SELECT` public sur `gallery`, `INSERT/UPDATE/DELETE` réservés au rôle admin (via cookie session existant).
- `src/lib/gallery.functions.ts` :
  - `listGalleryPhotos()` — liste + tri, renvoie `[{ url, alt, name }]`, cache 5 min.
  - `uploadGalleryPhoto()`, `updateGalleryAlt()`, `deleteGalleryPhoto()`, `reorderGalleryPhotos()` — protégés par `requireAdminSession`.
- Route API `/api/admin/gallery/upload` pour l'upload direct (multipart).

**Frontend**
- `src/components/lightbox.tsx` (nouveau) — pas de dépendance externe, swipe via pointer events natifs.
- `src/routes/index.tsx` — `Gallery` remplace le tableau `PHOTOS` en dur par `useSuspenseQuery(listGalleryPhotos)`, appel dans le loader. Fallback sur les 5 photos actuelles si le bucket est vide (le temps du premier upload).
- `src/routes/admin.tsx` — nouvel onglet **Photos** : liste avec drag-and-drop de réordonnancement, upload par glisser-déposer, édition `alt` inline, suppression avec confirmation.

**Amorçage**
- Upload des 5 photos existantes dans le bucket via `supabase--storage_upload` pendant l'implémentation.
- Suppression optionnelle des `photo-*.jpg` de `src/assets/listing/` **après** vérification que tout fonctionne — je garde `photo-2.jpg` (utilisé par `/guide-plages-hyeres`).

**Fichiers touchés**
- Nouveau : `src/components/lightbox.tsx`, `src/lib/gallery.functions.ts`, `src/routes/api/admin/gallery/upload.ts`
- Modifiés : `src/routes/index.tsx` (Gallery), `src/routes/admin.tsx` (onglet Photos)
- Migration SQL : policies RLS sur `storage.objects`

## Ce que ça change pour toi

- **Aujourd'hui** : rien à faire, tu vois les 5 photos actuelles avec la nouvelle lightbox.
- **Dans une semaine** : `/admin` → onglet **Photos** → drag-and-drop → publié en 5 secondes, aucune interaction avec moi.