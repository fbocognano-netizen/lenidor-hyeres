# Résultats de test - Sources d'événements TPM

Audit phase 1 réalisé le 2026-08-06. Aucun collecteur de production n'a été commencé.

## Commandes ajoutées

```bash
python -m tools.audit_source https://metropoletpm.fr/agenda
python -m tools.discover_feeds https://www.carqueiranne.fr/
python -m tools.capture_network https://www.ville-lagarde.fr/agenda
```

Les commandes utilisent uniquement la bibliothèque standard Python, ne stockent aucun cookie et ne nécessitent aucune clé API.

## Résultats par source

| Source | URLs testées | Résultat | Recommandation |
|---|---|---|---|
| Métropole TPM | `https://metropoletpm.fr/robots.txt`, `https://metropoletpm.fr/agenda`, `https://metropoletpm.fr/sitemap.xml` | Agenda public HTML et sitemap confirmés. `robots.txt` interdit `/agenda?*`. | Intégrer avec réserve |
| Provence Méditerranée | `https://www.provencemed.com/preparer-ma-venue/agenda/`, `https://www.provencemed.com/preparer-ma-venue/agenda/agenda-carqueiranne/` | Agenda général et page communale confirmés en HTML. | Intégrer avec réserve |
| Ville de Toulon | `https://www.toulon.fr/agenda`, `http://toulon.fr/agenda` | Agenda public confirmé, filtres visibles, endpoint "voir plus" non confirmé. | Intégrer avec réserve |
| Ville de La Garde | `https://www.ville-lagarde.fr/agenda`, `https://www.ville-lagarde.fr/agenda/578504`, `https://www.intramuros.org/la-garde04` | Agenda public confirmé, IntraMuros identifié. | Investigation complémentaire |
| Ville de La Crau | `https://www.villedelacrau.fr/`, `https://www.villedelacrau.fr/laville_loisirssorties.html`, `https://www.villedelacrau.fr/telechargements/docs/agenda_du_mois.pdf` | Page officielle et PDF mensuel confirmés. | Intégrer avec forte réserve |
| Ville de Carqueiranne | `https://www.carqueiranne.fr/`, `https://www.carqueiranne.fr/agenda-133.html`, `https://www.carqueiranne.fr/agenda-133/flux-rss.xml` | Agenda HTML paginé et flux RSS agenda confirmés. | Intégrer |
| Ville du Pradet | `https://www.le-pradet.fr/`, `https://www.le-pradet.fr/lagenda/`, `https://www.le-pradet.fr/evenement/`, `https://www.le-pradet.fr/feed/` | Agenda officiel HTML confirmé, pagination visible, flux RSS général confirmé. | Intégrer |
| Conservatoire TPM | `https://www.conservatoire-tpm.fr/`, `https://www.conservatoire-tpm.fr/agenda` | Agenda culturel HTML confirmé, filtres lieux/dates visibles. | Intégrer avec réserve |

## Contraintes et risques

- Ne pas utiliser d'endpoint non confirmé comme API.
- Ne pas automatiser les URLs `https://metropoletpm.fr/agenda?*` tant que `robots.txt` contient `Disallow: /agenda?*`.
- Ne pas utiliser d'API IntraMuros tant que les conditions de réutilisation ne sont pas validées.
- Ne pas recopier les descriptions longues ni les images sans licence ou autorisation claire.
- La Crau doit être considérée comme source fragile car l'agenda officiel exploitable est un PDF mensuel.

## Prochaines vérifications avant prototype

1. Rejouer `python -m tools.audit_source` sur chaque page Hyères/La Londe/Lavandou pour capturer les balises `<link rel="alternate">`, scripts et chemins standards.
2. Utiliser Playwright ou Chrome DevTools sur Toulon, Conservatoire TPM et La Garde pour résoudre les endpoints derrière "voir plus"/"afficher plus" et les filtres.
3. Vérifier les mentions légales/CGU de Provence Méditerranée, IntraMuros, Stratis/Carqueiranne et Conservatoire TPM.
4. Filtrer le flux RSS général du Pradet pour distinguer événements et actualités.
