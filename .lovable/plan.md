## Objectif

Rendre le code d'accès à `/admin` modifiable facilement, sans toucher au code, via le secret `ADMIN_ACCESS_CODE` déjà configuré côté serveur.

## État actuel

- `src/lib/admin-bookings.functions.ts` lit déjà `process.env.ADMIN_ACCESS_CODE` pour valider la connexion admin.
- Le secret existe (`ADMIN_ACCESS_CODE`) mais il n'y a aucun message clair quand il n'est pas défini, et aucune indication dans l'UI sur comment le changer.

## Changements

1. **`src/lib/admin-bookings.functions.ts`**
   - Si `ADMIN_ACCESS_CODE` est vide/absent : renvoyer un message d'erreur explicite ("Code admin non configuré. Définissez le secret ADMIN_ACCESS_CODE dans les paramètres du projet.") au lieu d'un simple throw générique.
   - Ajouter une petite fonction `getAdminConfigStatus` (server fn) qui retourne `{ configured: boolean }` sans exposer la valeur, pour que l'UI puisse afficher un état.

2. **`src/routes/admin.tsx`**
   - Sur l'écran de connexion, afficher une note discrète : *« Le code d'accès se modifie dans les paramètres du projet (secret `ADMIN_ACCESS_CODE`). »*
   - Si `getAdminConfigStatus` renvoie `configured: false`, afficher un encart d'alerte : *« Aucun code admin défini. Ajoutez le secret `ADMIN_ACCESS_CODE` pour activer l'espace hôte. »* + bouton désactivé.
   - Messages d'erreur plus clairs (secret manquant vs code incorrect).

3. **Message chat post-implémentation**
   - Rappeler comment changer le code : Paramètres projet → Backend/Secrets → modifier `ADMIN_ACCESS_CODE` → recharger `/admin`.

## Ce qui ne change pas

- La logique de session, la comparaison timing-safe et le stockage restent identiques.
- Aucune modification de base de données, ni de la page publique.
