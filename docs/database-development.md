# Procédure de développement base de données

## Avant de coder

- Identifier la table, la RPC ou le Storage concernés.
- Lire les types générés dans `src/integrations/supabase/types.ts`.
- Vérifier le client utilisé par les fonctionnalités existantes du même domaine.
- Définir qui peut lire, créer, modifier et supprimer.
- Décider quelles erreurs doivent être écrites dans `app_logs`.

## Migration SQL obligatoire

Toute modification de schéma doit être une nouvelle migration dans `supabase/migrations/`.

Une migration doit être :

- idempotente lorsque possible (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) ;
- accompagnée de contraintes, index, RLS et politiques nécessaires ;
- compatible avec les données déjà présentes ;
- testée dans l’éditeur SQL Lovable avant livraison ;
- référencée dans la PR avec son objectif.

Ne jamais modifier une ancienne migration déjà exécutée en production pour corriger le schéma.

## Tests obligatoires

Pour l'agenda, `source_category` conserve la valeur originale de la source et `category` contient la valeur normalisée utilisée par le site. Les variantes comme `projection`, `cinema` et `film` sont regroupées sous `cinema` sans modifier la source.

Avant une PR :

1. `pnpm run build`
2. `git diff --check`
3. vérifier les appels métier avec l’environnement local complet ;
4. vérifier qu’une requête publique ne renvoie pas de données sensibles ;
5. vérifier qu’un utilisateur non admin ne peut pas lancer une écriture admin ;
6. vérifier les cas d’erreur et les logs ;
7. vérifier la page sur mobile et desktop si elle est publique.

## Configuration locale

Le développement local doit disposer des mêmes noms de variables que le serveur, sans partager les valeurs dans Git :

```text
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

La clé `SUPABASE_SERVICE_ROLE_KEY` est nécessaire uniquement pour les fonctions serveur qui utilisent `supabaseAdmin`. Elle ne doit jamais être remplacée par une clé publishable dans une opération d’administration.

Si cette valeur n’est pas disponible localement, deux options propres existent :

- tester la fonction sur l’environnement Lovable Cloud configuré ;
- utiliser un environnement Supabase de développement configuré avec ses propres secrets.

On ne met pas une fausse clé, on ne copie pas une clé dans le code et on ne désactive pas RLS pour contourner le problème.

## Contrôle avant publication

La publication suit cette séquence :

```text
Codex local
→ build et tests
→ branche GitHub
→ PR
→ validation
→ merge main
→ publication Lovable
```

Lovable sert uniquement à publier le commit validé de `main`. Les changements de code, SQL, variables et politiques sont réalisés dans le dépôt par Codex.

## Diagnostic d’une panne

1. Lire le message visible dans l’interface.
2. Lire le terminal local ou les logs de déploiement.
3. Ouvrir `/admin` → **Logs** pour consulter `public.app_logs`.
4. Vérifier le nom exact de la table, de la RPC et des colonnes.
5. Vérifier les variables de l’environnement concerné.
6. Vérifier RLS et les politiques avec une requête SQL de lecture seule.
7. Vérifier que la migration attendue a bien été exécutée.

Un message générique côté navigateur ne doit jamais être considéré comme un diagnostic suffisant.
