# Evidence - Ville de Carqueiranne Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.carqueiranne.fr/agenda-133.html`
- Request: `GET https://www.carqueiranne.fr/agenda-133/flux-rss.xml`
- Reproduce:

```bash
curl -I -L 'https://www.carqueiranne.fr/agenda-133.html'
curl -I -L 'https://www.carqueiranne.fr/agenda-133/flux-rss.xml'
python -m tools.discover_feeds 'https://www.carqueiranne.fr/' --max-pages 6
curl -L 'https://www.carqueiranne.fr/agenda-133.html' | grep -iE 'rss|feed|agenda' | head
```

- Observed status: public page reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda page with date/search/location filters and pagination; RSS endpoint returns XML and contains event terms.
- Notes: RSS agenda endpoint confirmed on 2026-08-07.
