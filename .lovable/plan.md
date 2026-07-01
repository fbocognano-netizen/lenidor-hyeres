
## Ce qu'il manque aujourd'hui

Actuellement quand un client remplit le formulaire :
- La demande est bien enregistrée en base de données.
- **Personne n'est prévenu** : ni vous, ni le client.

Vous devez donc vous connecter manuellement pour voir les nouvelles demandes. Ce n'est pas viable.

## Ce que je propose de mettre en place

### 1. Email de confirmation au client (automatique)
Dès qu'il envoie sa demande, il reçoit un email :
- Récapitulatif des dates et du prix estimé
- Rappel des 40 € de ménage et de la caution de 500 € en espèces
- Message chaleureux signé Joëlle
- Précision que vous le recontactez sous 2 h pour confirmer

### 2. Email de notification à vous (Joëlle)
Vous recevez immédiatement un email avec :
- Nom, email, téléphone du client
- Dates demandées, nombre de voyageurs, message
- Montant total estimé
- Lien direct pour répondre au client

Vous choisissez l'adresse email de réception (ex. votre Gmail).

### 3. Suivi des envois
Un journal interne garde la trace de chaque email envoyé (envoyé / échoué), utile si un client dit ne pas avoir reçu la confirmation.

## Coût

- **Domaine d'envoi Lovable** : gratuit, aucune manipulation DNS de votre part. Les emails partiront d'une adresse type `reservation@notify.villador-hyeres.lovable.app`.
- **Envoi des emails** : inclus dans Lovable, pas d'abonnement Mailgun/SendGrid à payer.
- **Consommation** : chaque email consomme une toute petite fraction de vos crédits Lovable mensuels (négligeable pour le volume d'une location saisonnière — quelques dizaines d'emails par mois maximum).

En pratique : **aucun coût supplémentaire perceptible** pour votre usage.

## Alternative (plus tard, si souhaité)
- Utiliser votre propre domaine d'envoi (`reservation@votredomaine.fr`) : demande d'ajouter quelques enregistrements DNS chez votre registrar. On peut le faire plus tard.
- Ajouter aussi une notification SMS ou WhatsApp : possible mais nécessite un service tiers payant (Twilio ~0,08 €/SMS). Pas recommandé au démarrage.

## Ce dont j'ai besoin de vous pour lancer

1. **Adresse email** qui doit recevoir les notifications de réservation ?
2. **OK** pour utiliser le domaine d'envoi géré par Lovable (le plus simple, zéro config) ?
3. **Ton des emails** : sobre & professionnel, ou chaleureux & personnel (signé Joëlle) ?

Dès que vous validez ce plan et répondez aux 3 points, je mets tout en place en une fois.
