# Audit notifications de réservation

## Diagnostic

Les logs `booking_notifications` montrent que **toutes les tentatives d'envoi depuis le 3 juillet échouent** avec la même erreur Pingram :

```
HTTP 400 — missing_subject
"The email subject is required. Include a non-empty \"subject\" string in the request body."
```

### Cause racine
Dans `src/lib/pingram-notifications.server.ts`, la payload envoyée à Pingram place `subject` dans un objet imbriqué `email` :
```ts
body: JSON.stringify({
  type: "new_lead",
  to: recipientEmail,
  email: { subject: "...", html, previewText },  // ❌ Pingram ne le lit pas ici
})
```
Or Pingram attend `subject` au **niveau racine** (comme le faisait l'ancienne edge function `supabase/functions/notify-lead/index.ts`, qui elle fonctionnait). C'est bien une régression introduite en migrant l'envoi vers `.server.ts`.

### Point secondaire
Tu mentionnes "pour moi admin, **et pour mes clients**" — actuellement aucun email de confirmation n'est envoyé au client qui fait la demande. Seul l'admin est notifié (et cassé).

## Corrections

### 1. Fix payload Pingram (`src/lib/pingram-notifications.server.ts`)
Remettre le format plat qui fonctionnait :
```ts
body: JSON.stringify({
  type: "new_lead",
  to: recipientEmail,
  subject: "Nouvelle demande de réservation — Le Nid d'Or",
  html: buildHtml(lead),
})
```

### 2. Ajouter email de confirmation client
- Nouvelle fonction `sendGuestConfirmationEmail(lead)` dans `pingram-notifications.server.ts` avec un template HTML dédié (récap dates, voyageurs, total estimé, rappel que la demande sera confirmée manuellement sous 2h).
- Tracker aussi dans `booking_notifications` avec `recipient_email = lead.email` (le champ existe déjà).
- Appel après `createAndSendBookingNotification` dans `src/lib/bookings.functions.ts` (fire-and-forget, ne bloque jamais la réservation).

### 3. Nettoyage
Supprimer l'edge function obsolète `supabase/functions/notify-lead/` (plus appelée nulle part) pour éviter la confusion.

## Vérification
- Créer une réservation de test depuis le site.
- Vérifier dans `booking_notifications` : deux lignes `status='sent'` (admin + client).
- Confirmer réception dans la boîte `usertinder543@gmail.com` et sur l'email du test.
