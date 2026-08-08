# Instructions projet Le Nid d'Or

Ces règles s'appliquent à toute tâche Codex réalisée dans ce dépôt.

## Référence obligatoire pour Supabase

Avant toute modification qui lit, écrit, synchronise ou modifie le schéma de la base, lire :

- `docs/supabase-architecture.md`
- `docs/database-development.md`

Ces documents définissent l'architecture et la procédure obligatoires. En cas de contradiction, cette instruction et les règles de sécurité du projet priment.

## Règles d'accès aux données

- Ne jamais mettre une clé `SUPABASE_SERVICE_ROLE_KEY` dans le navigateur, dans une variable `VITE_*`, dans GitHub ou dans le code source.
- Ne jamais demander à l'utilisateur de fournir, copier, coller, retrouver ou exposer `SUPABASE_SERVICE_ROLE_KEY`.
- Ne jamais présenter l'absence locale de `SUPABASE_SERVICE_ROLE_KEY` comme un blocage fonctionnel pour ce projet. Si une écriture ne peut pas être testée depuis le terminal local, indiquer simplement qu'elle doit être vérifiée via l'environnement serveur déjà configuré.
- Ne jamais inventer un nouveau secret, jeton, hook secret ou mécanisme d'accès pour contourner un test local. Réutiliser strictement l'architecture existante du domaine concerné.
- Utiliser `src/integrations/supabase/client.server.ts` et `supabaseAdmin` uniquement côté serveur pour les opérations protégées, administratives et d'écriture.
- Utiliser `src/integrations/supabase/client.ts` avec la clé publishable uniquement côté navigateur ou pour une RPC SQL explicitement conçue pour un usage public et protégée par validation/RLS.
- Pour l'agenda, l'écriture passe par `agenda-sync.server.ts`, `agenda-admin.functions.ts` ou le hook serveur existant, puis par `supabaseAdmin`. Ne pas créer une deuxième voie d'écriture.
- Ne jamais contourner RLS pour rendre une page publique fonctionnelle. Si une lecture est publique, créer une politique RLS minimale et limitée aux colonnes réellement publiques, ou passer par une Server Function qui ne renvoie qu'un DTO public.
- Toute nouvelle table, colonne sensible, RPC ou politique doit être livrée dans une nouvelle migration `supabase/migrations/` et documentée.
- Toute erreur métier ou d'accès importante doit être enregistrée via `logAppEvent` sans exposer de secret ni de donnée personnelle inutile.

## Développement local et vérification

- Vérifier les variables d'environnement nécessaires avant de conclure qu'une requête ou une page est cassée.
- Ne jamais inventer, demander à Lovable de générer ou copier une valeur secrète dans le dépôt.
- Tester séparément local, preview et production : un succès en production ne prouve pas que l'environnement local est configuré.
- Avant une PR, exécuter au minimum `pnpm run build` et `git diff --check`, puis tester le parcours concerné.
- Lire les logs serveur et `/admin` → `Logs` avant de corriger un message générique affiché au navigateur.

## Lovable

- Lovable est uniquement une surface de publication.
- Ne jamais envoyer de demande de modification, de génération de code, de SQL, de secret ou de configuration à Lovable.
- Publier uniquement un commit déjà validé et présent sur GitHub `main`, après accord explicite de production.
- Avant de proposer ou créer un cron, une tâche planifiée ou un webhook récurrent, vérifier d'abord les jobs Lovable existants et `docs/lovable-jobs.md`.
- Pour l'agenda, le job Lovable existant `agenda-sync-daily` déclenche `POST /api/public/hooks/agenda-sync` tous les jours à 04:15. Ne pas créer de second job sans décision explicite.

## Documentation

Après toute évolution d'architecture, mettre à jour les documents concernés dans `docs/` et expliquer la modification dans la PR.
