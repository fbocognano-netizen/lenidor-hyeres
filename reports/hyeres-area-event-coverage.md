# Couverture événements autour de Hyères

Date de cadrage : 2026-08-07.

Objectif : passer du périmètre initial TPM limité à Toulon, Le Pradet, La Garde, La Crau et Carqueiranne vers un périmètre utile pour Le Nid d'Or autour de Hyères.

## Périmètre recommandé

| Priorité | Commune | Raison | Source officielle prioritaire |
|---|---|---|---|
| 1 | Hyères | Commune du bien, incluant Giens, l'Ayguade, Port d'Hyères, Porquerolles selon les pages | https://hyeres.fr/agenda-hyeres/ |
| 1 | La Londe-les-Maures | Commune voisine littorale, événements touristiques et festifs fréquents | https://www.ville-lalondelesmaures.fr/culture-et-sport/agenda.html |
| 1 | Le Lavandou | Destination littorale proche, agenda OT riche | https://www.ot-lelavandou.fr/agenda-lavandou/tout-lagenda/ |
| 1 | Bormes-les-Mimosas | Destination proche, forte activité touristique | https://www.bormeslesmimosas.com/ |
| 1 | Carqueiranne | Commune voisine immédiate côté TPM | https://www.carqueiranne.fr/agenda-133.html |
| 1 | Le Pradet | Commune voisine côté TPM | https://www.le-pradet.fr/lagenda/ |
| 2 | La Garde | Commune proche, agenda IntraMuros | https://www.ville-lagarde.fr/agenda |
| 2 | La Crau | Commune proche, source officielle surtout PDF/HTML | https://www.villedelacrau.fr/laville_loisirssorties.html |
| 2 | Toulon | Gros volume d'événements, utile mais moins "proche séjour Hyères" | https://www.toulon.fr/agenda |
| 2 | La Farlède | Vallée du Gapeau, événements locaux structurés | https://www.lafarlede.fr/mes-loisirs/agenda/ |
| 2 | Pierrefeu-du-Var | Proche arrière-pays, agenda municipal riche | https://www.pierrefeu-du-var.fr/ |
| 3 | Solliès-Ville | Source municipale visible, volume plus faible | https://solliesville.fr/ |
| 3 | Solliès-Pont | À confirmer | À rechercher |
| 3 | Solliès-Toucas | À confirmer | À rechercher |

## Sources transversales à conserver

| Source | Couverture | Utilité |
|---|---|---|
| Provence Méditerranée - Agenda général | Hyères, Toulon, Carqueiranne, La Londe et autres communes touristiques | Très utile pour récupérer rapidement beaucoup d'événements touristiques filtrables par commune |
| Provence Méditerranée - Agenda Hyères | Hyères | Source prioritaire complémentaire à la Ville d'Hyères |
| Métropole TPM | Toulon, Le Pradet, La Garde, La Crau, Carqueiranne, Hyères selon couverture TPM | Utile pour les communes TPM, avec prudence robots |
| Conservatoire TPM | Événements culturels sur sites TPM | Utile pour concerts, master class, spectacles |
| Office de tourisme du Lavandou | Le Lavandou, Bormes, La Londe sur certaines fiches | Utile pour littoral est |

## Stratégie prototype

Le premier prototype doit collecter les sources suivantes, dans cet ordre :

1. Ville d'Hyères : page officielle `https://hyeres.fr/agenda-hyeres/`.
2. ProvenceMed Hyères : `https://www.provencemed.com/preparer-ma-venue/agenda/agenda-hyeres/`.
3. Ville de La Londe : `https://www.ville-lalondelesmaures.fr/culture-et-sport/agenda.html`.
4. Office de tourisme du Lavandou : `https://www.ot-lelavandou.fr/agenda-lavandou/tout-lagenda/`.
5. Carqueiranne ou Le Pradet comme source municipale TPM simple.

Ensuite seulement :

- ajouter La Garde après validation IntraMuros ;
- ajouter La Crau avec extraction PDF si nécessaire ;
- ajouter Toulon et Conservatoire TPM après capture des boutons "voir plus" ;
- ajouter Bormes, La Farlède, Pierrefeu, Solliès-Ville si le périmètre éditorial confirme qu'ils doivent apparaître.

## Contraintes

- Les événements doivent être filtrés par ville réelle de l'événement, pas seulement par source.
- Les descriptions longues et les images doivent rester liées à leur source tant que la licence n'est pas claire.
- Les sources qui offrent "Ajouter à mon Google Agenda" ou "Save Ical" sur les fiches ne doivent pas être considérées comme flux ICS global tant que l'URL exacte n'est pas testée.
- Les événements récurrents doivent être conservés comme occurrences distinctes avant toute déduplication.
