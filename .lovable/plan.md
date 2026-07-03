## Problème

Ta connexion admin échoue avec "Code incorrect". La logique côté serveur est correcte : elle compare (via hash SHA-256 anti-timing) ce que tu tapes avec la valeur du secret `ADMIN_ACCESS_CODE`. Les logs confirment que le serveur reçoit ta saisie mais ne la reconnaît pas.

Deux causes probables :
1. La valeur enregistrée dans `ADMIN_ACCESS_CODE` n'est plus celle dont tu te souviens (ou contient un espace/retour à la ligne invisible ajouté lors du collage).
2. Tu as peut-être renseigné le code dans `ADMIN_ACCESS_TOKEN` (qui existe aussi dans tes secrets et ne sert à rien ici) au lieu de `ADMIN_ACCESS_CODE`.

## Plan

### 1. Réinitialiser proprement le code d'accès
Utiliser `update_secret` pour `ADMIN_ACCESS_CODE` — cela t'ouvre un formulaire sécurisé où tu tapes un nouveau code (choisis quelque chose de simple, sans espace, ex : `villa2026`). Une fois enregistré, tu le connaîtras avec certitude.

### 2. Rendre la comparaison tolérante aux espaces invisibles
Dans `src/lib/admin-bookings.functions.ts`, appliquer un `.trim()` sur `input` et `expected` avant le hash SHA-256, pour éviter qu'un espace ou retour à la ligne collé accidentellement dans le secret ne casse la connexion à jamais.

### 3. Supprimer le secret orphelin `ADMIN_ACCESS_TOKEN`
Il n'est utilisé nulle part dans le code et prête à confusion — le retirer via `delete_secret`.

### 4. Améliorer le message d'erreur sur l'écran de login
Actuellement il affiche seulement "Code incorrect". Ajouter une aide contextuelle : "Le code se configure dans Paramètres → Backend → Secrets → `ADMIN_ACCESS_CODE`" pour que tu retrouves toujours où aller.

### Détails techniques
- Fichier modifié : `src/lib/admin-bookings.functions.ts` (fonction `passwordMatches`)
- Fichier modifié : `src/routes/admin.tsx` (bloc `{loginError === "invalid" && ...}`)
- Secrets : `update_secret(["ADMIN_ACCESS_CODE"])` puis `delete_secret("ADMIN_ACCESS_TOKEN")`

Aucune régression attendue sur le reste du site (page publique, réservations, notifications Pingram).
