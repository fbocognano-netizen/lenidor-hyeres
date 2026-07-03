## Pourquoi tu ne reçois rien aujourd'hui

En vérifiant le code : **aucune intégration Pingram n'existe dans le projet**. Il n'y a pas de dossier `supabase/functions/`, ni d'appel à Pingram dans `createBooking`. Le secret `PINGRAM_API_KEY` n'est pas non plus enregistré. Le message précédent a annoncé la mise en place mais rien n'a été réellement écrit.

Résultat : quand tu valides le formulaire, la réservation est bien enregistrée en base, mais aucun email n'est envoyé nulle part.

## Ce que je vais faire

1. **Secrets**
   - Demander la saisie de `PINGRAM_API_KEY` (ta clé secrète Pingram).
   - Créer `NOTIFY_ADMIN_EMAIL` = `usertinder543@gmail.com` (modifiable ensuite dans Cloud → Secrets sans toucher au code).

2. **Edge Function Supabase `notify-lead`** (`supabase/functions/notify-lead/index.ts`)
   - Reçoit `{ guest_name, email, phone, message, check_in, check_out, guests, total_price }`.
   - Appelle l'API Pingram (`pingram.send`) en mode contenu direct :
     - `type: "new_lead"`
     - `to.email`: valeur de `NOTIFY_ADMIN_EMAIL`
     - `email.subject`: `"Nouveau lead depuis le site"`
     - `email.html`: nom, email, téléphone, dates, voyageurs, message, total, date de création
   - Pas de `templateId`.
   - Logs explicites en cas d'erreur (statut HTTP + corps de réponse Pingram), sans jamais logger la clé.
   - Config par défaut Lovable (`verify_jwt = false` déjà appliqué), pas de bloc à ajouter.

3. **Déclenchement depuis `createBooking`** (`src/lib/bookings.functions.ts`)
   - Après un `insert` réussi dans `bookings`, appeler l'edge function via `supabaseAdmin.functions.invoke("notify-lead", { body: {...} })`.
   - Enveloppé dans un `try/catch` : si Pingram échoue, la réservation reste enregistrée (on ne casse pas l'UX client), l'erreur est juste loguée.

4. **Vérification**
   - Après implémentation : tester avec une fausse réservation, consulter les logs de l'edge function pour confirmer l'envoi (status 200 Pingram).
   - Si erreur d'auth Pingram → vérifier la clé ; si adresse expéditeur refusée → il faudra vérifier le domaine d'envoi côté Pingram.

## Ce qui ne change pas

- Aucune modification du frontend, du formulaire, ni du calcul de prix.
- L'espace `/admin` reste fonctionnel comme aujourd'hui.
- Clé Pingram jamais exposée côté navigateur : uniquement lue dans l'edge function via `Deno.env.get("PINGRAM_API_KEY")`.

## Point à confirmer

Le prérequis Pingram : ton compte Pingram doit autoriser l'envoi vers `usertinder543@gmail.com` depuis une adresse expéditeur valide (généralement configurée dans le dashboard Pingram). Si Pingram exige un `from` vérifié, dis-moi quelle adresse utiliser ; sinon j'utilise le défaut du compte.
