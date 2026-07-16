
## Audit mobile (390 px)

Constats principaux :

1. **Hero** — le H1 est en `text-5xl` sur mobile : « Le silence du sud, face aux Îles d'Or » prend 4 lignes et cache le coucher de soleil. Le padding `pb-14` + les 2 boutons full-width empilés poussent tout hors du visuel « rêve ». Résultat : la promesse visuelle (mer + verres) disparaît.
2. **Espacement vertical excessif partout** — toutes les sections utilisent `py-24` (≈ 192 px haut + bas). Sur mobile, ça crée des bandes de vide énormes entre chaque bloc (visibles entre Séjour / Galerie / Équipements / Réservation / Lieu).
3. **Section Séjour** — H2 en `text-4xl` casse en 4 lignes ; les 4 « Stats » (Voyageurs / Lits / Bain / Note) sont en cartes trop grandes (padding 5, chiffres `text-3xl`) → occupent un écran entier pour peu d'info.
4. **Galerie** — hauteur `h-[420px]` + une 5ᵉ photo `h-64` ajoutent presque 700 px de scroll pour 5 images.
5. **Équipements** — grille 2 colonnes sur mobile → « Piscine de 18 m, vue mer & îles d'Or » wrappe sur 3 lignes tordues. Passer en 1 colonne mobile est plus lisible.
6. **Réservation** — titre `text-4xl`, bloc `py-24`, liste + boutons plateformes + formulaire → énorme scroll. Espacements internes du formulaire trop généreux (`mt-10 pt-8`).
7. **Carte / Lieu** — H2 « Hyères, porte des Îles d'Or » suivi de gros vides, puis carte pleine hauteur, puis encore un bloc footer très aéré.

## Corrections proposées (mobile-first, desktop conservé)

Toutes les modifications se limitent à des classes Tailwind — **aucun texte ni logique modifiés**. Le pattern : ajuster mobile en base + garder valeurs actuelles derrière `sm:`/`md:`.

### 1. Hero (`Hero`)
- Hauteur : `h-[72vh] min-h-[460px]` en mobile (au lieu de 78vh/520).
- Padding container : `px-5 pb-8 sm:pb-14` (moins de marge basse pour recentrer sur l'image).
- H1 : `text-[2.25rem] sm:text-6xl md:text-7xl leading-[1.08]` + retirer le `<br />` forcé (garder pour ≥ sm) → texte plus compact mobile.
- Paragraphe : `text-sm sm:text-lg mt-3 sm:mt-5`.
- Boutons : `mt-5 sm:mt-8`, `size="default" sm:size="lg"`, largeur auto (pas full-width forcé).
- Overlay dégradé un peu plus sombre en bas (`to-deep/75`) pour lisibilité sans agrandir le texte.

### 2. Sections — rythme vertical
Remplacer partout `py-24` par `py-14 sm:py-20 md:py-24` :
`Intro`, `Gallery`, `Amenities`, `BookingSection`, section Lieu, section Carte.

### 3. Séjour (`Intro`)
- H2 : `text-[1.75rem] sm:text-4xl md:text-5xl leading-[1.15]`.
- Grille stats : `gap-3 sm:gap-4`; Cartes `Stat` : padding `p-4 sm:p-5`, valeur `text-2xl sm:text-3xl`, marges internes réduites (`mt-2`, `mt-0.5`).
- Espacement bloc texte → stats : `gap-8 md:gap-10`.

### 4. Galerie
- Hauteur : `h-[320px] sm:h-[420px] md:h-[560px]`.
- Photo pleine largeur en dessous : `h-40 sm:h-64`.
- Marge titre → grille : `mb-6 sm:mb-10`.

### 5. Équipements
- Grille : `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (1 col mobile).
- Padding items : `py-3 sm:py-4`, `gap-3` icône/texte.
- H2 : `text-[1.75rem] sm:text-5xl`.
- Marge titre → grille : `mt-8 sm:mt-12`.

### 6. Réservation (`BookingSection` + `BookingForm`)
- H2 : `text-[1.75rem] sm:text-5xl`.
- `gap-8 lg:gap-12` entre colonne intro et formulaire.
- Bloc « plateformes » : `mt-6 pt-6 sm:mt-10 sm:pt-8`.
- Carte formulaire : padding réduit mobile, champs `space-y-4` au lieu de 5-6, TOTAL ESTIMÉ + CTA en ligne (flex) au lieu de bloc empilé — le titre « à partir de 75 € / nuit » ne doit pas wrapper sur 3 lignes.

### 7. Lieu / Carte / Footer
- H2 « Hyères, porte des Îles d'Or » : `text-[1.75rem] sm:text-5xl`.
- Tableau distances : `py-3` au lieu de `py-4`.
- Carte : hauteur `h-[300px] sm:h-[420px]` au lieu de valeur fixe grande.
- Footer / bloc contact : `py-12 sm:py-20` et espacements internes `space-y-4`.

### 8. Header
- Vérifier padding vertical `py-3 sm:py-4` pour rester compact.

## Livraison

Un seul fichier édité : `src/routes/index.tsx`. Aucun changement de contenu, uniquement classes Tailwind responsive. Après implémentation, je recapture le mobile (390 px) pour valider avant de te rendre la main.
