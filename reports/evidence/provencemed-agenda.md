# Evidence - Provence Méditerranée Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.provencemed.com/preparer-ma-venue/agenda/`
- Request: `GET https://www.provencemed.com/preparer-ma-venue/agenda/agenda-carqueiranne/`
- Reproduce:

```bash
curl -I -L 'https://www.provencemed.com/preparer-ma-venue/agenda/'
curl -I -L 'https://www.provencemed.com/preparer-ma-venue/agenda/agenda-carqueiranne/'
```

- Observed status: public pages reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda pages list local events with commune-oriented navigation.
- Notes: no API/RSS endpoint was confirmed during this audit.
