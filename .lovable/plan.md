# Intégration Gens de Confiance + gestion des ICS dans l'admin

## Étape 1 — Ajout immédiat de l'ICS Gens de Confiance (sans régression)

Aujourd'hui les URLs iCal sont codées en dur à deux endroits :
- `src/lib/bookings.functions.ts` → `fetchBlockedRanges()` (Airbnb + Abritel)
- `src/lib/admin-bookings.functions.ts` → `getAdminOtaRanges()` (Airbnb + Abritel)

Action : ajouter dans les deux endroits la source `gensdeconfiance` avec l'URL fournie, et une variable d'env optionnelle `GENSDECONFIANCE_ICAL_URL` (même pattern que `AIRBNB_ICAL_URL` / `ABRITEL_ICAL_URL`). Le parseur iCal existant gère déjà ce format standard — aucune autre logique à toucher.

Résultat : dès cette étape, les dates réservées sur Gens de Confiance bloquent le calendrier et apparaissent dans la vue admin des OTAs.

## Étape 2 — Rendre la liste des ICS configurable dans l'admin

### Nouvelle table `ical_sources`
Champs métier : `label` (texte affiché, ex : "Airbnb"), `url` (URL du .ics), `enabled` (booléen, défaut true). RLS activée, accès `service_role` uniquement (les server functions passent par `supabaseAdmin`, jamais exposé au client). Timestamps standards + trigger updated_at.

Migration seed : insère les 3 sources actuelles (Airbnb, Abritel, Gens de Confiance) avec les URLs actuellement en dur, pour garantir zéro régression au premier chargement.

### Server functions admin (dans `src/lib/admin-bookings.functions.ts`)
Toutes protégées par `isAdminUnlocked()` (même pattern que le reste du fichier) :
- `listIcalSources` — liste toutes les sources
- `createIcalSource({ label, url })`
- `updateIcalSource({ id, label?, url?, enabled? })`
- `deleteIcalSource({ id })`

### Refactor de la lecture des ICS
Créer un helper partagé `src/lib/ical-sources.server.ts` avec `getActiveIcalSources()` qui lit la table (via `supabaseAdmin`) et retourne `[{ source, url }]`. En cas d'échec DB, fallback sur la liste actuellement hardcodée pour ne rien casser.

Remplacer :
- `fetchBlockedRanges()` dans `bookings.functions.ts` → utilise `getActiveIcalSources()` puis mappe sur `fetch` + `parseICal` (comportement inchangé, juste la liste devient dynamique).
- `getAdminOtaRanges()` dans `admin-bookings.functions.ts` → idem, la couleur/label affiché côté admin devient le `label` stocké en base au lieu du littéral `"airbnb"|"abritel"`.

### UI admin (`src/routes/admin.tsx`)
Nouvelle section "Calendriers synchronisés (iCal)" en dessous des réservations :
- Tableau des sources existantes : label, URL (tronquée), toggle enabled, boutons Modifier / Supprimer
- Formulaire d'ajout : label + URL + bouton "Ajouter"
- Refetch de `getAdminOtaRanges` après chaque mutation pour que le calendrier admin reflète tout de suite le changement

### Anti-régression
- Le parseur iCal, le calcul de chevauchement, les tarifs, l'email Pingram et l'espace admin ne sont pas touchés.
- Les URLs actuelles sont préservées via le seed migration → même comportement au 1er déploiement.
- Le fallback hardcodé dans `getActiveIcalSources()` couvre une éventuelle erreur DB.
- Les couleurs Airbnb/Abritel côté admin restent gérées par label (case-insensitive) pour ne pas perdre le code couleur existant.

## Détails techniques

```text
Table public.ical_sources
  id uuid pk
  label text not null
  url text not null
  enabled boolean not null default true
  created_at / updated_at timestamptz
RLS on, aucune policy anon/authenticated → seul service_role accède
GRANT ALL ... TO service_role
```

## Ce que je t'expliquerai à la fin
Une fois livré, je te dirai :
1. Comment ajouter/supprimer/désactiver un calendrier depuis `/admin` (parcours UI, effet immédiat sur le calendrier public).
2. Où voir la sync (section OTA de l'admin, code couleur par label).
3. Le comportement de secours si la table est vide ou inaccessible (fallback sur les 3 URLs historiques).
