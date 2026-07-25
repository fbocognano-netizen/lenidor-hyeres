## Objectif

Enrichir le footer du site avec une vraie section Contact : un accès rapide à Joëlle par WhatsApp/téléphone, plus un mini-formulaire de message. Les messages envoyés depuis le formulaire arrivent par email admin via le canal Pingram déjà en place.

## Préconisations pour ce type d'établissement

Pour une location saisonnière de particulier à particulier, la section Contact doit rassurer et rester simple :

- **WhatsApp en premier** : c'est le canal le plus naturel pour les voyageurs (questions rapides, photos, voix).
- **Numéro de téléphone cliquable** (`tel:`) en complément pour ceux qui préfèrent appeler.
- **Formulaire de message court** pour les visiteurs qui ne veulent pas sortir du site.
- **Horaires de réponse** affichées : « Joëlle répond sous 2 h ».
- **Pas d'email en clair** : on évite le spam en passant par le formulaire.

## Implémentation proposée

### 1. Footer enrichi (`src/routes/index.tsx`)

Transformer le bloc « Contact » existant du footer en une section plus actionnable :

- Titre : « Une question ? Parlez à Joëlle ».
- Bouton WhatsApp doré (`variant="cta"`) avec icône, ouvrant `https://wa/33XXXXXXXXX`.
- Lien d'appel téléphonique secondaire.
- Mention « Réponse sous 2 h ».
- Mini-formulaire intégré : nom, email, téléphone (optionnel), message.

Le design reste dans l'identité « Sable & Mer » du site (Fraunces + Inter, couleurs dorées et profondes).

### 2. Envoi du formulaire de contact

Créer une server function `sendContactMessage` dans `src/lib/contact.functions.ts` :

- Valider les champs avec Zod (nom, email valide, message non vide, longueurs limitées).
- Envoyer un email à l'admin via Pingram avec le même pattern que `createAndSendBookingNotification`.
- Sujet : « Nouveau message depuis le site — Le Nid d'Or ».
- Contenu : nom, email, téléphone, message, date/heure.
- Retourner un statut `ok` au client pour afficher un toast de confirmation.
- Logger les erreurs dans `app_logs` comme pour les réservations.

### 3. Stockage du numéro WhatsApp/téléphone

Le numéro n'est pas une donnée sensible, mais il est préférable de le rendre configurable sans rebuild. Deux options :

- **Option A (recommandée)** : le stocker dans une variable d'environnement côté serveur, par exemple `CONTACT_PHONE_NUMBER`, lue dans la server function et exposée au client via une server function publique `getContactInfo`.
- **Option B** : le laisser en dur dans le code si Joëlle ne souhaite pas le changer régulièrement.

Je préconise l'**Option A** pour garder la flexibilité.

### 4. Validation et sécurité

- Validation Zod côté client et serveur.
- Longueur maximale sur les champs (nom 100 caractères, email 255, message 1000).
- Pas de HTML dans le message (échappement côté email).
- Limiter le débit côté serveur si possible (pas de rate-limit complexe, juste une vérification basique).

### 5. UX mobile

- Le formulaire reste en une seule colonne sur mobile.
- Le bouton WhatsApp reste bien visible et suffisamment grand pour le pouce.
- Pas de champ obligatoire superflu.

## Fichiers modifiés ou créés

- `src/routes/index.tsx` : footer enrichi + formulaire de contact.
- `src/lib/contact.functions.ts` : nouvelle server function d'envoi de message.
- `src/lib/pingram-notifications.server.ts` : ajout d'une fonction utilitaire `sendAdminContactNotification` (ou réutilisation du pattern existant).
- Configuration du secret/env `CONTACT_PHONE_NUMBER` (à définir avec Joëlle).

## Besoin de ta part

Le numéro de téléphone/WhatsApp de Joëlle est nécessaire pour rendre le bouton fonctionnel. Peux-tu me le communiquer ? Il sera stocké côté serveur (pas visible en clair dans le code source public).

Une fois le numéro fourni, je peux implémenter directement.