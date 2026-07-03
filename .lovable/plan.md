Vous avez raison : le 25 ne devrait pas être grisé. Les calendriers externes indiquent bien :

```text
Réservé : 22 → 25 juillet  = nuits du 22, 23, 24
Libre   : 25 → 27 juillet  = nuits du 25 et 26
Réservé : 27 juillet → 3 août
```

Le problème vient du mélange entre dates UTC côté synchronisation calendrier et dates locales côté affichage. En France, ça décale les comparaisons d’environ 2 heures, donc le 25 peut être traité comme encore bloqué alors qu’il est libre.

Plan de correction :

1. **Comparer uniquement des dates “jour” (`YYYY-MM-DD`)**
   - Ne plus comparer les timestamps `Date.getTime()` pour l’affichage du calendrier.
   - Convertir chaque jour affiché en clé stable `YYYY-MM-DD`.

2. **Appliquer la vraie règle de nuitée**
   - Une réservation `[check_in, check_out)` bloque uniquement les nuits de `check_in` inclus à `check_out` exclu.
   - Donc une réservation `22 → 25` bloque 22, 23, 24, mais pas le 25.

3. **Autoriser les jours de rotation**
   - Le jour de départ d’une réservation doit rester cliquable comme arrivée.
   - Le jour d’arrivée de la réservation suivante doit rester cliquable comme départ.
   - Exemple attendu : `25 → 27 juillet` doit être sélectionnable.

4. **Garder la sécurité serveur actuelle**
   - Le serveur continue de refuser les vrais chevauchements de nuits.
   - On corrige seulement la logique d’affichage/sélection du calendrier.

5. **Vérifier visuellement après correction**
   - 22, 23, 24 juillet grisés.
   - 25 et 26 juillet sélectionnables.
   - 27 juillet sélectionnable uniquement comme date de départ si l’arrivée est le 25, mais pas comme nuit libre.