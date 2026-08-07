# Evidence - Métropole TPM Robots/Sitemap

- Tested at: 2026-08-06T00:00:00+02:00
- Request: `GET https://metropoletpm.fr/robots.txt`
- Request: `GET https://metropoletpm.fr/sitemap.xml`
- Reproduce:

```bash
curl -L 'https://metropoletpm.fr/robots.txt'
curl -I -L 'https://metropoletpm.fr/sitemap.xml'
```

- Observed status: public files reachable in web audit
- Useful headers: replay with `curl -I -L`
- Response excerpt/paraphrase: robots declares a sitemap and includes a disallow rule for `/agenda?*`.
- Notes: sitemap can be used to discover public event detail pages, subject to final robots/terms review.
