## Diagnostic sans modification

J’ai vérifié le code, les requêtes récentes, les secrets configurés, les logs et les tables de réservation sans modifier le projet.

### Ce qui fonctionne
- Les demandes de réservation sont bien enregistrées : 4 demandes existent dans la table `bookings`.
- Le secret `ADMIN_ACCESS_CODE` existe bien.
- Le secret `NOTIFY_ADMIN_EMAIL` existe bien.
- Le secret `PINGRAM_API_KEY` existe bien.
- Les appels récents au login admin ont renvoyé `ok: true` côté serveur quand le code `ADMIN_ACCESS_CODE` a été saisi.

### Problèmes identifiés

1. **Admin : session probablement cassée ou fragile**
   - Le code admin est comparé à `ADMIN_ACCESS_CODE`.
   - Mais la session de connexion admin utilise un autre secret : `ADMIN_ACCESS_TOKEN`.
   - Ce secret a été supprimé/absent d’après la liste actuelle des secrets.
   - Résultat probable : même si le code est bon, l’espace admin ne peut pas garder correctement l’état “connecté”, ou certaines fonctions admin peuvent échouer.

2. **Notifications email : la fonction n’est pas appelée ou pas déployée correctement**
   - Il y a 4 réservations en base.
   - La table `booking_notifications` est vide.
   - Les logs de la fonction `notify-lead` sont vides.
   - Donc le problème n’est pas seulement “Pingram n’envoie pas” : actuellement, on ne voit même pas de trace fiable que le flux de notification s’exécute jusqu’au bout.

3. **Incohérence entre le fallback email et la fonction email**
   - Le code de réservation utilise une valeur par défaut `usertinder543@gmail.com` si `NOTIFY_ADMIN_EMAIL` manque.
   - Mais l’Edge Function `notify-lead` exige absolument `NOTIFY_ADMIN_EMAIL` et échoue si ce secret manque.
   - Même si le secret existe maintenant, cette incohérence rend le système fragile.

4. **Architecture inutilement compliquée**
   - Pour un site simple, l’envoi email passe par : formulaire → server function → base → Edge Function → Pingram → retour statut.
   - Ça multiplie les points de panne.
   - Le plus robuste serait d’envoyer Pingram directement depuis la server function de réservation, puis enregistrer le statut dans `booking_notifications`.

## Plan de correction proposé

### 1. Corriger l’accès admin
- Remplacer l’usage de `ADMIN_ACCESS_TOKEN` pour la session par un secret de session dédié et stable.
- Comme il faut une vraie clé de chiffrement de session, générer automatiquement `ADMIN_SESSION_SECRET` si elle n’existe pas.
- Garder `ADMIN_ACCESS_CODE` uniquement comme code que vous tapez pour entrer dans `/admin`.
- Résultat : vous pourrez changer le code admin sans casser la session technique.

### 2. Simplifier et fiabiliser les notifications email
- Déplacer l’envoi Pingram dans une fonction serveur interne, appelée directement par `createBooking`.
- Garder `booking_notifications` comme historique visible dans `/admin`.
- Ne plus dépendre de l’Edge Function `notify-lead` pour le flux principal.
- Enregistrer précisément : `pending`, `sent`, ou `failed`, avec message d’erreur lisible.

### 3. Garder le bouton “Renvoyer la notif”
- Le bouton admin “Renvoyer la notif” utilisera le même helper serveur fiable.
- S’il échoue, l’erreur sera visible dans l’historique de la demande.

### 4. Vérifier après correction
- Tester une connexion `/admin`.
- Vérifier que les 4 réservations existantes apparaissent.
- Tester l’envoi ou le renvoi d’une notification.
- Vérifier que `booking_notifications` contient bien une ligne avec le statut.

## Aucun changement maintenant

Je n’ai pas modifié le code, conformément à votre demande. Si vous approuvez ce plan, je ferai uniquement ces corrections ciblées.