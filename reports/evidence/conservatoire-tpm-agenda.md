# Evidence - Conservatoire TPM Agenda

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.conservatoire-tpm.fr/agenda`
- Reproduce:

```bash
curl -I -L 'https://www.conservatoire-tpm.fr/agenda'
curl -L 'https://www.conservatoire-tpm.fr/agenda' | head
```

- Observed status: public page reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: agenda culturel with discipline/date/place filters and an "Afficher plus" control.
- Notes: endpoint behind "Afficher plus" not confirmed.
