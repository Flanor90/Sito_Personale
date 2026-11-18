# AI-README — Sito_Personale

Sito statico personale di Alberto Del Bove, psicoterapeuta (`albertodelbove-psicologo.it`, GitHub Pages via `CNAME`). HTML + Tailwind + JS vanilla; backend leggero su Supabase (raccolta email, pannello admin).

**Leggere prima:** `BRANDBOOK.md` (voce e identità, fonte di verità) · `SEO-BRIEF.md` · `PANNELLO-SETUP.md` · `NEWSLETTER-SETUP.md`.

## Mappa

| Percorso | Cosa contiene |
|---|---|
| `index.html` | Home one-page. Contiene header/footer condivisi fra i marcatori `INIZIO/FINE … CONDIVISA` |
| `pagine/*.html` | **Sorgenti** delle pagine dedicate e degli articoli (contenuto + metadati; il blocco `articolo` con data programma l'uscita) |
| `<slug>/index.html` (es. `depressione/`, `chi-sono/`, `colleghi/`, `scritti/`, `psicologo-a-itri/`, `en/`…) | **Generate** da `build-pagine.js` (sorgente + header/footer di `index.html`) — non modificare a mano |
| `build-pagine.js` | Assembla le pagine dedicate, l'elenco `articoli/` (+ `feed.xml`) e la sitemap |
| `build-icone.js` | Genera le icone (`assets/icone.js`) |
| `build-pdf.js`, `pdf/`, `tools/genera-guida-pdf.js` | Generazione guide PDF (copertine, font) |
| `assets/` | JS (`analytics`, `consenso`, `i18n`, `icone`, `lettore`, `newsletter`, `pagine`, `quiz-core`, `report-pdf`, `richiesta`, `temi`), `tailwind.css` (generato), immagini, PDF guide, `etsy/` |
| `tailwind.config.js`, `tailwind.input.css` | Sorgenti CSS |
| `admin/` | Pannello admin (contatti/email): `admin.js`, `markdown.js` |
| `supabase/functions/` | Edge functions Deno: `api/` (pubblica), `admin/`, `_lib/` (db, mail, trello, util) |
| `supabase/migrations/` | Schema, RLS, statistiche |
| `newsletter/`, `test/` | Pagine newsletter e test/quiz |
| `tests/` | `node --test`: analytics, markdown, newsletter, quiz-core |
| `.github/workflows/` | `test.yml` (CI), `pubblica-articoli.yml` (lunedì 05:00 UTC: ribuilda e pubblica gli articoli in scadenza), `indexnow.yml`, `funzioni-supabase.yml` (pubblica le funzioni Supabase quando cambiano, con il segreto `SUPABASE_ACCESS_TOKEN`) |
| `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` | SEO / GEO |
| `tools/indexnow.js` | Ping IndexNow (Bing) a ogni modifica |

## Comandi
- `npm run build` — pagine + icone + CSS (dopo ogni modifica a `pagine/`, `index.html` o classi Tailwind)
- `npm test` · `npm run serve` (http://localhost:8742)

## Regole
- Modifica il sorgente (`pagine/`, `index.html`), poi ribuilda; mai le pagine generate.
- Testi a nome del brand: seguire `BRANDBOOK.md`.
