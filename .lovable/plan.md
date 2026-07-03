## Ce que vous constatez

Les nuits du 25 et du 26 juillet 2026 **sont bien libres** dans votre planning Airbnb :
- Une réservation existante finit le 25 juillet (arrivée 22, départ 25).
- La suivante commence le 27 juillet.

Donc une nouvelle réservation du **25 au 27 juillet** (2 nuits) est théoriquement possible. Mais le calendrier du site ne vous laisse pas la sélectionner.

## Pourquoi

Le calendrier bloque toutes les dates d'une réservation, **arrivée comprise**. Résultat : le 27 juillet (jour d'arrivée du client suivant) apparaît comme indisponible. Or dans l'hôtellerie, ce jour-là est valide comme **date de départ** pour le client précédent — c'est le principe de la rotation le même jour.

Comme la sélection de la plage est bloquée si la date de départ est marquée indisponible, on ne peut pas cliquer sur le 27 pour finir un séjour qui commence le 25.

Même problème symétrique pour le 25 : si un autre client cherche à arriver le jour où le vôtre repart, il ne peut pas non plus le sélectionner comme date d'arrivée.

## Ce que je propose de faire

Modifier uniquement le comportement du calendrier de la page publique (aucun changement de logique métier ni de base de données) :

1. **Distinguer deux types de jours bloqués** :
   - Les jours **complets** (nuits déjà réservées) → restent non cliquables.
   - Les jours de **rotation** (arrivée d'une réservation OU départ d'une réservation) → cliquables, mais uniquement comme jour d'arrivée ou de départ, jamais au milieu d'un séjour.

2. **Bloquer la sélection d'une plage** qui contiendrait une nuit déjà réservée entre l'arrivée et le départ choisis (protection anti-chevauchement conservée).

3. **Afficher un léger indicateur visuel** sur les jours de rotation (par ex. demi-teinte) pour que le visiteur comprenne qu'il peut y arriver ou y partir mais pas y dormir seul.

4. La règle serveur (`createBooking`) reste inchangée : elle refuse déjà les vrais chevauchements de nuits, donc la sécurité anti-double-réservation est préservée.

## Fichiers concernés

- `src/routes/index.tsx` : logique `blockedDates` / `isBlocked` et props du composant `Calendar`.
- Éventuellement `src/lib/bookings.functions.ts` : ajouter dans `getBlockedDates` un marqueur `turnover` pour chaque date de début/fin de plage, pour que le front sache quel jour est une rotation.

Aucune modification du back-office admin, ni de la base de données, ni des tarifs.

## Vérification après implémentation

- Sur le calendrier, le 25 et le 27 juillet doivent apparaître comme jours de rotation.
- Sélection possible : arrivée 25 → départ 27 (2 nuits, tarif haute saison).
- Sélection toujours impossible : arrivée 23 → départ 27 (contient la nuit du 23 déjà réservée).
