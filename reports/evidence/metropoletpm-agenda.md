# Evidence - Métropole TPM Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://metropoletpm.fr/agenda`
- Reproduce:

```bash
curl -I -L 'https://metropoletpm.fr/agenda'
curl -L 'https://metropoletpm.fr/agenda' | head
```

- Observed status: public page reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda page with visible filters and event cards; the page displayed a total of 80 events during audit.
- Notes: use with `https://metropoletpm.fr/robots.txt`, which contains `Disallow: /agenda?*`.
