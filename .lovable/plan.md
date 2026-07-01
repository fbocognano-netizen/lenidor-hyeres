
# Emails automatiques à chaque nouvelle réservation

## Ce que tu veux
Dès qu'une ligne apparaît dans la table `bookings` (formulaire de réservation soumis), envoyer :
1. Un **email de confirmation au client** (adresse saisie dans le formulaire)
2. Un **email de notification à l'administrateur** (toi)

## Approche recommandée : Lovable Emails (pas Edge Function)

Sur ta stack (TanStack Start + Lovable Cloud), l'approche moderne n'est **pas** une Edge Function Supabase. Lovable fournit un système d'emails intégré (Lovable Emails) qui :

- gère un domaine d'expédition vérifié (SPF/DKIM)
- expose une file d'attente avec retries, logs et suppression des bounces
- rend des templates React Email (design cohérent avec ton site)
- se déclenche depuis ton code serveur existant

Aucune clé API tierce (Resend, SendGrid…) requise. Pas de gestion de secrets à faire.

### Pourquoi pas un trigger Postgres → Edge Function ?
- Un trigger DB qui appelle du HTTP est fragile (pas de retry propre, logs éclatés, tu ne peux pas facilement personnaliser la template).
- Ta stack est TanStack Start : la logique serveur vit dans `createServerFn`, pas dans des Edge Functions.
- Le déclenchement à l'insert marche mieux **au moment de la création** (dans `createBooking`), où on a déjà toutes les données validées.

## Plan d'implémentation

### 1. Prérequis email (une seule fois)
- Vérifier / configurer un **domaine d'envoi** (ex. `notify.villador-hyeres.lovable.app` ou ton domaine perso si tu en connectes un)
- Provisionner l'**infrastructure email** (file d'attente, cron d'envoi, table `email_send_log`)
- Scaffolder les **templates transactionnels** de base

Ces trois étapes se font via les outils Lovable en un flux automatique — je te guiderai si un domaine n'existe pas.

### 2. Créer deux templates React Email
Dans `src/lib/email-templates/` :

- **`booking-confirmation.tsx`** — pour le client
  - Merci pour votre réservation
  - Récap : dates, nombre de voyageurs, nuits, total, caution 500 € espèces
  - Rappel : demande en attente de confirmation, tu recontactes sous 2 h
  - Coordonnées / infos pratiques

- **`booking-notification.tsx`** — pour l'admin (toi)
  - Nouvelle demande de réservation
  - Nom, email, téléphone du client
  - Dates, voyageurs, message
  - Montant total calculé
  - Lien vers la ligne en base

### 3. Déclencher l'envoi dans `createBooking`
Modifier `src/lib/bookings.functions.ts` : juste après le `insert` réussi, enfiler **deux** envois :

```
sendTransactionalEmail({ templateName: "booking-confirmation", recipientEmail: data.email, ... })
sendTransactionalEmail({ templateName: "booking-notification", recipientEmail: ADMIN_EMAIL, ... })
```

Avec un `idempotencyKey` basé sur l'id de la réservation → pas de doublon si la fonction rejoue.

### 4. Email admin
J'ai besoin de **ton adresse email admin** (celle qui recevra les notifications). Tu peux me la dire en clair ou je peux la stocker en variable serveur.

## Questions avant de démarrer

1. **Quelle adresse admin** doit recevoir les notifications de nouvelles réservations ?
2. **Domaine d'expédition** : OK pour utiliser un sous-domaine géré par Lovable (rien à faire côté DNS) ou tu as un domaine perso que tu veux brancher ?
3. **Contenu des emails** : je pars sur un style sobre cohérent avec le site (couleurs mer/soleil, ton chaleureux mais pro), OK ?

Réponds à ces trois points et j'implémente tout d'une traite.
