# Evidence - Ville du Pradet Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.le-pradet.fr/lagenda/`
- Request: `GET https://www.le-pradet.fr/evenement/`
- Request: `GET https://www.le-pradet.fr/feed/`
- Reproduce:

```bash
curl -I -L 'https://www.le-pradet.fr/lagenda/'
curl -I -L 'https://www.le-pradet.fr/evenement/'
curl -I -L 'https://www.le-pradet.fr/feed/'
python -m tools.discover_feeds 'https://www.le-pradet.fr/lagenda/' --max-pages 8
```

- Observed status: public pages reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda page shows event cards, pagination and category filters; RSS general feed responds as XML and contains event-related content.
- Notes: RSS is general, not confirmed as event-only. Filter by taxonomy/type before using as primary source.
