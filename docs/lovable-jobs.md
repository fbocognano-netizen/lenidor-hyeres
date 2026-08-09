# Jobs Lovable

Ce fichier sert de registre des tâches planifiées connues pour le projet. Avant de proposer un cron, un webhook récurrent ou une nouvelle planification, vérifier cette page et l'écran Lovable **Jobs**.

## agenda-sync-daily

- Statut connu : actif.
- Horaire Lovable : tous les jours à 04:15.
- Rôle : lancer la synchronisation quotidienne de l'agenda.
- Endpoint appelé : `POST /api/public/hooks/agenda-sync`.
- Code appelé ensuite : `runAgendaSync({ days: 45, trigger: "lovable-job:agenda-sync-daily" })`.
- Données écrites : `agenda_sync_runs`, `agenda_events`, `agenda_occurrences`, puis logs dans `app_logs`.

## Vérification

Pour diagnostiquer l'agenda :

1. Vérifier dans Lovable **Jobs** que `agenda-sync-daily` est actif.
2. Vérifier dans `/admin` -> **Logs** les événements `agenda_sync_hook_triggered`, `agenda_sync_success` ou `agenda_sync_failed`.
3. Vérifier dans `/admin` -> **Agenda** le dernier run et le détail `source_stats`.
4. Ne pas créer de nouveau cron si ce job existe déjà : corriger le job existant, son endpoint ou le code appelé.

## Logs d'étapes

Chaque exécution agenda doit écrire des logs `agenda_sync_step` avec le même `runId`.

Étapes attendues :

- `started`
- `hyeres_preview_collected`
- `cote_azur_collected`
- `nearby_source_collected` pour chaque source voisine
- `nearby_collected`
- `hyeres_matched`
- `rows_prepared`
- `events_upsert_started`
- `events_upsert_completed`
- `occurrences_delete_started`
- `occurrences_delete_completed`
- `occurrences_insert_started`
- `occurrences_insert_completed`
- `completed`

En cas d'échec, chercher `agenda_sync_failed` avec le même `runId`, puis remonter au dernier `agenda_sync_step` enregistré.

## Détails attendus dans les logs

Les logs `nearby_source_collected` doivent permettre de comprendre source par source :

- `requestUrls` : URL réellement appelées.
- `rawItemsSeen` : volume brut reçu depuis la source.
- `eventsSeen` : événements gardés pour la période synchronisée.
- `eventsRejected` : éléments ignorés.
- `rejectedInvalid`, `rejectedNoDate`, `rejectedOutOfRange` : causes de rejet RSS quand elles sont disponibles.
- `pagesFetched` : nombre de pages API appelées.
- `linksDiscovered`, `linksFetched` : liens HTML trouvés puis explorés.
- `errorMessage` : erreur limitée et sans secret si la source échoue.

Le log `rows_prepared` doit indiquer :

- `rowsBeforeSourceUrlDedupe` : lignes candidates avant dédoublonnage.
- `duplicateSourceUrls` : lignes retirées car une autre ligne porte la même URL source.
- `rows` : lignes réellement envoyées à Supabase.

L'écriture agenda se fait par `source_url`, qui est la contrainte unique de `agenda_events`. Cela permet de remplacer proprement une ancienne source par une source officielle plus fiable lorsqu'elles pointent vers la même page d'événement, sans créer de doublon ni bloquer la synchronisation.
