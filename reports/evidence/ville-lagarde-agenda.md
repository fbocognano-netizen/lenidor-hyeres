# Evidence - Ville de La Garde Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.ville-lagarde.fr/agenda`
- Request: `GET https://www.ville-lagarde.fr/agenda/578504`
- Reproduce:

```bash
curl -I -L 'https://www.ville-lagarde.fr/agenda'
curl -I -L 'https://www.ville-lagarde.fr/agenda/578504'
```

- Observed status: public pages reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda page displays event cards, month/city filters and 61 total events; event detail page is public.
- Notes: footer identifies IntraMuros SAS; verify reuse terms before automation.
