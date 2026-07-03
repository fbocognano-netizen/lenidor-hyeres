## Diagnostic

Les logs serveur confirment que les deux secrets existent bien : `ADMIN_ACCESS_CODE` et `ADMIN_SESSION_SECRET` sont configurés. La session n’est pas le problème à ce stade.

Le serveur répond explicitement : `login_invalid_code`. Donc le code tapé ne correspond pas exactement à la valeur actuellement enregistrée dans le secret `ADMIN_ACCESS_CODE` côté backend. Le message “code incorrect” vient bien de la comparaison serveur, pas d’un bug visuel de la page.

## Plan de correction ciblé

1. **Arrêter la boucle “code incorrect”**
   - Remplacer le système par une réinitialisation propre du secret admin.
   - Je vais ouvrir le formulaire sécurisé de remplacement de `ADMIN_ACCESS_CODE` pour que tu mettes un nouveau code simple et certain.
   - Aucun code secret ne sera écrit dans le code ni affiché dans les logs.

2. **Rendre la page admin plus tolérante**
   - Conserver la normalisation existante : suppression des espaces, guillemets et caractères invisibles.
   - Ajouter si nécessaire une normalisation encore plus stricte pour éviter les erreurs de copier-coller.

3. **Améliorer le message côté interface**
   - Quand le serveur dit `invalid`, afficher clairement : “Le code ne correspond pas au secret ADMIN_ACCESS_CODE actuellement enregistré.”
   - Ajouter une action visible “Réinitialiser le code dans Backend → Secrets” plutôt que laisser croire à un bug technique.

4. **Vérifier immédiatement après changement**
   - Tester `/admin` après remplacement du secret.
   - Confirmer que le login retourne `login_ok_session_updated` dans les logs.
   - Confirmer que la liste/calendrier des réservations s’affiche.

## Fichiers concernés

- `src/lib/admin-bookings.functions.ts`
- `src/routes/admin.tsx`

## Action nécessaire de ton côté

Quand tu valides ce plan, je lancerai la demande sécurisée de remplacement du secret `ADMIN_ACCESS_CODE`. Tu pourras saisir un nouveau code admin sans me le montrer.