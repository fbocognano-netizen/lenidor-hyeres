# Evidence - Ville de La Crau Loisirs et Agenda PDF

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://www.villedelacrau.fr/laville_loisirssorties.html`
- Request: `GET https://www.villedelacrau.fr/telechargements/docs/agenda_du_mois.pdf`
- Reproduce:

```bash
curl -I -L 'https://www.villedelacrau.fr/laville_loisirssorties.html'
curl -I -L 'https://www.villedelacrau.fr/telechargements/docs/agenda_du_mois.pdf'
```

- Observed status: public page/PDF reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: official leisure page links to a monthly agenda PDF.
- Notes: source is usable only with a fragile PDF extraction strategy.
