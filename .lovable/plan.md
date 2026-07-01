
# Emails de réservation automatiques

Inclus dans ton plan Lovable actuel — aucun abonnement supplémentaire, juste une fraction de crédits par email envoyé.

## Ce que je vais mettre en place

1. **Configuration du domaine d'envoi Lovable** (géré, zéro DNS de ton côté)
2. **Infrastructure email** (file d'attente, logs, retries automatiques)
3. **Deux templates** cohérents avec le style du site (Fraunces + sable/mer, ton chaleureux signé Joëlle) :
   - **Client** : confirmation que sa demande a bien été reçue + récap (dates, voyageurs, total, caution 500 € espèces à l'arrivée, taxe de séjour)
   - **Admin (toi)** : notification nouvelle réservation avec toutes les infos (nom, email, téléphone, dates, message, montant)
4. **Adresse admin paramétrable** via un secret `ADMIN_EMAIL` modifiable à tout moment (sans toucher au code)
5. **Déclenchement automatique** dans `createBooking` (`src/lib/bookings.functions.ts`) : dès qu'une réservation est insérée en base, les deux emails partent en parallèle

## Fichiers modifiés / créés

- `src/lib/email-templates/booking-confirmation.tsx` (nouveau — email client)
- `src/lib/email-templates/booking-notification.tsx` (nouveau — email admin)
- `src/lib/email-templates/registry.ts` (enregistrement des templates)
- `src/lib/email/send.ts` (helper d'envoi)
- `src/lib/bookings.functions.ts` (appel des envois après insertion)

## Action requise de ta part

1. Cliquer sur « Configurer le domaine d'envoi » quand je le proposerai en build
2. Me donner ton **adresse email admin** (celle qui reçoit les notifs)

Dès ces deux éléments fournis, je fais tout le reste en une passe.
