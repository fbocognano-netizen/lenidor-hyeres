# Evidence - Ville de Toulon Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.toulon.fr/agenda`
- Canonical/observed page: `http://toulon.fr/agenda`
- Reproduce:

```bash
curl -I -L 'https://www.toulon.fr/agenda'
curl -L 'https://www.toulon.fr/agenda' | head
```

- Observed status: public page reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda page with theme/type/date filters and a "Voir plus d'événements" control; 56 results displayed during audit.
- Notes: endpoint behind "Voir plus" not confirmed.
