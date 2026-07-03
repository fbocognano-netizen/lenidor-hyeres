## Contexte / réponses aux questions

- **Envoi vers Airbnb/Abritel/Leboncoin** : impossible techniquement (pas d'API publique, réservé aux Channel Managers payants). Tu confirmes que tu bloqueras manuellement les dates sur chaque OTA après une résa directe.
- **Accès /admin** : reste par bookmark uniquement (`/villador-hyeres.lovable.app/admin`), aucun lien public ajouté. Je retire même le lien "Espace hôte" du footer pour plus de discrétion.
- **Où sont les résas** : dans la table `bookings` de Lovable Cloud, consultables dans `/admin`.

## Ce que je vais construire

### 1. Onglets dans `/admin` (deux vues)
- **Onglet "Calendrier"** (par défaut) : vue mensuelle avec navigation mois précédent/suivant.
  - Code couleur : 🟢 réservation directe, 🔴 Airbnb, 🟠 Abritel (récupéré via iCal).
  - Clic sur un jour occupé → panneau latéral avec détails de la résa.
- **Onglet "Liste"** : liste chronologique actuelle améliorée (à venir, en cours, passées), triée par date d'arrivée.

### 2. Actions sur les réservations directes
Sur chaque résa directe (dans les 2 vues) :
- **Confirmer** : passe le statut de `pending` → `confirmed`.
- **Annuler / Libérer** : passe le statut en `cancelled`. Les dates redeviennent immédiatement disponibles dans le calendrier public (la logique de blocage filtre déjà par statut).
- **Répondre par email** : bouton `mailto:` déjà existant, conservé.
- **Renvoyer la notif** : conservé.

Les résas Airbnb/Abritel restent en lecture seule (elles se gèrent sur l'OTA).

### 3. Rappel visuel OTA
Bandeau d'info dans `/admin` :
> "⚠️ Après confirmation d'une résa directe, pense à bloquer les dates sur Airbnb, Abritel et Leboncoin — la synchronisation automatique vers les OTA n'est pas possible."

Avec liens directs vers les calendriers OTA (Airbnb / Abritel / Leboncoin).

## Détails techniques

- **Fichiers modifiés** :
  - `src/lib/admin-bookings.functions.ts` : ajouter `updateBookingStatus(id, status)` et `getBlockedDatesWithSources()` (qui renvoie aussi la source Airbnb/Abritel pour la vue calendrier).
  - `src/routes/admin.tsx` : ajouter les onglets, le composant calendrier (grille mensuelle custom légère, pas de dépendance lourde), le panneau détails, les boutons d'action.
  - `src/lib/bookings.functions.ts` : s'assurer que le filtre de disponibilité exclut bien les résas `cancelled`.
  - `src/routes/index.tsx` : retirer le lien "Espace hôte" du footer.
- **Pas de nouvelle table** ni de migration : on utilise le champ `status` existant (`pending`, `confirmed`, `cancelled`).
- **Pas de flux .ics sortant** (tu as choisi le blocage manuel).
