## Constat

- Les réservations sont bien enregistrées dans la base : plusieurs demandes récentes existent.
- La fonction `notify-lead` répond bien `200 OK` quand elle est appelée directement.
- Pingram répond aussi `200 OK` côté backend, donc l'appel technique à Pingram part bien.
- Le problème restant est très probablement l'un de ces points : email accepté par Pingram mais non délivré, mauvais expéditeur/domaine côté Pingram, ou absence de traçabilité entre une réservation précise et la notification envoyée.

## Plan de correction

1. **Ajouter une vraie traçabilité des notifications**
   - Créer une table de suivi des notifications liées aux réservations.
   - Enregistrer pour chaque demande : réservation concernée, destinataire, statut, réponse Pingram, erreur éventuelle, date d'envoi.

2. **Relier chaque réservation à son envoi Pingram**
   - Après création d'une réservation, appeler `notify-lead` avec l'identifiant de la réservation.
   - Si l'email échoue, ne pas bloquer la réservation, mais enregistrer l'erreur clairement.

3. **Rendre les logs exploitables**
   - Ajouter des logs avec : id réservation, destinataire, statut Pingram, extrait de réponse Pingram.
   - Éviter les logs vagues du type “send ok” sans preuve liée à une réservation.

4. **Ajouter un contrôle visible dans `/admin`**
   - Afficher sur chaque demande si la notification email admin a été envoyée, échouée, ou non tentée.
   - Ajouter éventuellement un bouton “Renvoyer la notification” pour tester sans refaire une fausse réservation.

5. **Vérifier l'adresse admin configurée**
   - Utiliser le secret `NOTIFY_ADMIN_EMAIL` comme destinataire.
   - Confirmer dans l'interface admin quelle adresse est utilisée, sans afficher de secret sensible.

## Résultat attendu

Tu ne seras plus dans le flou : pour chaque demande, tu verras si l'email a été demandé à Pingram, si Pingram l'a accepté, et si une erreur existe. Si Pingram accepte mais que Gmail ne reçoit rien, on saura que le blocage est côté délivrabilité Pingram/Gmail et non côté formulaire ou site.