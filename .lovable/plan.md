## Où se trouve la logique actuelle

- `src/lib/pingram-notifications.server.ts` : tous les emails (HTML en dur, envoyés via l'API Pingram).
  - `buildGuestHtml` / `sendGuestConfirmationEmail` : accusé de réception au client.
  - `buildHtml` / `createAndSendBookingNotification` : alerte à l'hôte.
  - `buildContactHtml` / `sendAdminContactNotification` : formulaire de contact.
- Déclenchement à la création : `src/lib/bookings.functions.ts` (lignes 219 et 243).
- Changement de statut : `updateBookingStatus` dans `src/lib/admin-bookings.functions.ts` — il fait uniquement un `update({ status })` en base. Aucun email n'existe pour les statuts : c'est pour cela que le client n'est jamais informé d'une annulation.

## Ce qui va être ajouté

### 1. Deux nouveaux templates dans `pingram-notifications.server.ts`

- `buildGuestConfirmedHtml` : « Votre séjour est confirmé — Le Nid d'Or ». Rappel des dates, voyageurs, total estimé, ménage/caution, mention que Joëlle enverra les instructions d'arrivée, contact WhatsApp.
- `buildGuestCancelledHtml` : « Votre demande n'a pas pu être retenue — Le Nid d'Or ». Ton chaleureux, rappel des dates concernées, invitation à proposer d'autres dates.

Même style visuel que l'email existant (fond `#faf7f2`, signature Joëlle).

### 2. Une fonction d'envoi générique

`sendGuestStatusEmail(lead, status)` réutilisant exactement la mécanique existante : insertion d'une ligne `booking_notifications` en `pending`, appel Pingram, puis mise à jour `sent`/`failed` avec journalisation dans `app_logs`.

### 3. Branchement dans l'admin

Dans `updateBookingStatus` :
- récupérer la réservation (nom, email, dates, voyageurs, total) et son statut actuel avant la mise à jour ;
- après un update réussi, si le nouveau statut est `confirmed` ou `cancelled` **et** qu'il diffère de l'ancien, envoyer l'email correspondant ;
- l'envoi ne bloque pas la réponse : en cas d'échec Pingram, le statut reste modifié et l'erreur est loguée (comme aujourd'hui pour les autres emails). La réponse renverra `emailSent: true/false` pour affichage.

### 4. Retour visuel dans `/admin`

Le toast après changement de statut indiquera si l'email client est bien parti ou s'il a échoué. Les envois restent visibles dans l'historique des notifications déjà affiché par réservation.

## Notes techniques

Aucune migration de base : `booking_notifications` accepte déjà ces lignes. Aucune nouvelle dépendance, aucun nouveau secret — on reste sur Pingram et `PINGRAM_API_KEY`.
