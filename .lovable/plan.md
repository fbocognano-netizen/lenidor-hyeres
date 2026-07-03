## Diagnostic

Le bouton admin appelle bien le serveur, et le secret `ADMIN_ACCESS_CODE` est détecté comme configuré. Le problème restant vient très probablement de la persistance de session après saisie du code : le serveur marque la session comme ouverte, mais la page recharge ensuite les réservations sans retrouver cet état, donc l’admin reste bloqué ou retombe sur “code incorrect / non connecté”.

## Plan de correction ciblé

1. **Séparer complètement le code admin et la session**
   - Garder `ADMIN_ACCESS_CODE` uniquement comme mot de passe saisi par vous.
   - Utiliser `ADMIN_SESSION_SECRET` uniquement pour chiffrer le cookie de session.
   - Supprimer le fallback fragile qui réutilise le code admin comme secret de session.

2. **Forcer le rechargement fiable après connexion**
   - Après un login réussi, invalider les données admin puis relancer explicitement le chargement des réservations.
   - Afficher un état clair “connexion en cours” au lieu de laisser la page sembler bloquée.

3. **Améliorer les erreurs visibles**
   - Distinguer : code faux, secret absent, session impossible, erreur serveur.
   - Ne plus afficher seulement “code incorrect” quand le serveur a en fait un problème de session.

4. **Ajouter des logs serveur temporaires non sensibles**
   - Logguer seulement des statuts (`configured`, `login_ok`, `session_updated`, `authenticated`) sans jamais afficher le code secret.
   - Ces logs permettront de confirmer exactement où ça bloque si le problème revient.

5. **Vérifier le résultat**
   - Tester `/admin` dans la preview.
   - Confirmer que la saisie du code ouvre bien la liste/calendrier des réservations.
   - Confirmer que les 4 réservations existantes sont visibles.

## Fichiers concernés

- `src/lib/admin-bookings.functions.ts`
- `src/routes/admin.tsx`

Aucun changement de design ou de réservation client n’est prévu dans cette correction.