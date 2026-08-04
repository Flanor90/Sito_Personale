# Brief SEO — albertodelbove-psicologo.it

**Per:** Claude Code, in `~/Documents/GitHub/Sito_Personale`
**Data audit:** 4 agosto 2026
**Obiettivo:** passare da un sito one-page a un'architettura che possa posizionarsi su più query, senza rompere il sistema di build esistente.

---

## 1. Stato verificato (non rifare questa analisi)

### Google Search Console
- Proprietà: `https://www.albertodelbove-psicologo.it/` (URL-prefix), verificata da poco tramite `google8a6db0dd25a47e4f.html`.
- **Sitemap `/sitemap.xml` inviata oggi.** Stato mostrato: *Impossibile recuperare*, `Ultima lettura` vuota, `Tipo: Sconosciuto`.
  → È lo stato normale di una proprietà appena verificata: Google non l'ha ancora letta. Anche "Indicizzazione pagine" dice *Elaborazione dei dati in corso*. **Non reinviare, non modificare la sitemap per questo.** Ricontrollare fra 3–5 giorni; solo se dopo resta "Impossibile recuperare" con `Ultima lettura` valorizzata c'è un problema reale.
- Problemi di sicurezza: **nessuno**. Azioni manuali: nessuna.
- `sitemap.xml` servito in produzione: valido, 6 URL, XML ben formato.

### Cosa è già fatto bene (non toccare)
- `index.html`: canonical, `robots: index, follow, max-image-preview:large`, OG completo con dimensioni immagine, Twitter card, meta geo (`geo.region`, `geo.position`, ICBM), theme-color, preload dell'immagine LCP.
- JSON-LD sulla home: `Psychologist`+`MedicalBusiness`+`LocalBusiness` con `@id`, indirizzo, geo, `openingHoursSpecification`, `makesOffer`, `sameAs`, `vatID` — più `WebSite`, `Person` (E-E-A-T con `hasCredential`: albo n. 23754, specializzazione SPS), `BreadcrumbList`, `FAQPage` (5 Q&A).
- `robots.txt`: corretto, dichiara la sitemap, non blocca `/admin/` (che ha `noindex` proprio) — scelta giusta, lasciarla.
- Un solo `<h1>`, 15/15 `<img>` con `alt`, 18 `loading="lazy"`, Tailwind compilato staticamente (niente CDN render-blocking).
- `build-pagine.js`: genera le pagine dedicate + rigenera `sitemap.xml`. Sistema pulito, va usato, non aggirato.

### Il limite vero
Quindici sezioni tematiche (`#approccio`, `#expat`, `#supervisione`, `#test`, `#percorso`, `#portfolio`…) vivono su **un solo URL**. Google può posizionare quell'URL per una query principale, non per quindici. Chi cerca "terapia di coppia online", "attacchi di panico psicologo", "supervisione clinica psicoterapeuti" non ha una pagina su cui atterrare.

Pagine reali oggi: `/`, `/test/`, `/compendi/`, `/en/`, `/newsletter/`, `/guida-ia/`.

---

## 2. Vincoli di implementazione (leggere prima di scrivere codice)

1. **Non modificare mai `/<slug>/index.html` a mano.** È generato. Il sorgente è `pagine/<slug>.html`.
2. Ogni nuova pagina = un nuovo file `pagine/<slug>.html` che inizia con un blocco `<!--METADATI { … } -->` in JSON valido. Campi supportati da `componi()`:
   `slug` (obbl.), `titolo` (obbl.), `descrizione` (obbl.), `ogTitolo`, `briciola`, `lingua`, `immagine`, `priorita`, `frequenza`, `alternati` (mappa `codice → percorso`), `schema` (oggetto JSON-LD aggiuntivo, si somma al `BreadcrumbList` automatico).
3. Build: `npm run build:pagine`. Genera le cartelle e **riscrive `sitemap.xml`** includendo automaticamente i nuovi slug. Se il comando fallisce, fallisce rumorosamente: leggere l'errore, non commentare i marcatori.
4. Header e footer sono ritagliati da `index.html` fra i marcatori `INIZIO/FINE INTESTAZIONE CONDIVISA` e `INIZIO/FINE PIÈ DI PAGINA CONDIVISO`. Modifiche al menu si fanno **solo** in `index.html`.
5. Il contenuto del file sorgente finisce dentro `<main id="main" class="pt-24">`: quindi deve iniziare da `<h1>` / `<section>`, non ripetere header o `<main>`.
6. Classi Tailwind: se se ne usano di nuove, ricompilare (`npm run build:css`), altrimenti non esistono nel CSS statico.

---

## 3. Pagine da creare

Priorità in ordine. Ognuna deve essere una pagina **vera** (900–1.500 parole di contenuto originale), non un rimbalzo verso un'ancora della home: i rimbalzi Google li tratta come soft-404 e non portano un visitatore in più.

### 3.1 `/psicoterapia-online/` — priorità 1
- **Query target:** psicoterapia online, psicologo online, terapia online
- **`titolo`** (≤60 car.): `Psicoterapia online | Dott. Alberto Del Bove`
- **`descrizione`** (≤155 car.): come funziona un percorso di psicoterapia psicoanalitica online, cosa cambia rispetto allo studio, come si prenota il primo colloquio.
- **H2 obbligatori:** Come funziona una seduta online · Cosa cambia (e cosa no) rispetto alla presenza · Per chi è indicata e per chi meno · Piattaforma, privacy e segreto professionale · Costi e primo colloquio
- **`schema`:** `MedicalWebPage` con `about: {"@type":"MedicalTherapy","name":"Psicoterapia psicoanalitica"}` + `provider: {"@id":"https://www.albertodelbove-psicologo.it/#psicoterapeuta"}`, più un `FAQPage` (4–6 domande).

### 3.2 `/terapia-di-coppia/` — priorità 1
- **Query target:** terapia di coppia, terapia di coppia online, consulenza di coppia
- **`titolo`:** `Terapia di coppia online e in studio | Alberto Del Bove`
- **H2:** Quando ha senso venire in due · Come si lavora sulla domanda della coppia · Durata e frequenza · Se uno dei due non vuole venire · Costi e primo colloquio
- **`schema`:** `MedicalWebPage` + `Service` (`serviceType: "Terapia di coppia"`, `areaServed`) + `FAQPage`.

### 3.3 `/ansia-e-attacchi-di-panico/` — priorità 1
- **Query target:** attacchi di panico, ansia psicologo, cosa fare durante un attacco di panico
- **`titolo`:** `Ansia e attacchi di panico: cosa sono e cosa fare`
- **H2:** Che cos'è un attacco di panico · Perché arriva "senza motivo" · Cosa fare nel momento · Quando l'ansia chiede un percorso · Come la si legge in chiave psicodinamica
- **Attenzione YMYL:** contenuto sanitario. Serve firma visibile, numero d'albo, data di ultima revisione, e nessuna promessa di guarigione. Aggiungere `lastReviewed` e `reviewedBy` nello schema `MedicalWebPage`.

### 3.4 `/burnout-e-stress-da-lavoro/` — priorità 2
- **Query target:** burnout sintomi, stress da lavoro psicologo, esaurimento lavorativo
- Collegare al test burnout già esistente su `/test/`: è il naturale invito all'azione intermedio.
- **`schema`:** `MedicalWebPage` + `FAQPage`.

### 3.5 `/psicologo-per-italiani-all-estero/` — priorità 2
- **Query target:** psicologo italiano all'estero, terapia in italiano expat, psicologo online per italiani all'estero
- Bassa concorrenza, altissima conversione. Contenuto: la lingua madre in terapia, fusi orari, aspetti fiscali/di fatturazione, psicologia della migrazione.
- **`alternati`:** valutare una versione EN corrispondente (vedi §4.2).

### 3.6 `/supervisione-clinica/` — priorità 2
- **Query target:** supervisione clinica psicologi, supervisione psicoterapeuti online, supervisione di équipe
- Pubblico professionale: registro più tecnico. Portare `Service` schema con `audience: {"@type":"Audience","audienceType":"Psicologi e psicoterapeuti"}`.

### 3.7 `/psicologo-a-itri/` — priorità 3 (SEO locale)
- **Query target:** psicologo Itri, psicoterapeuta Latina, psicologo provincia di Latina
- Contenuto: lo studio, come arrivarci, i comuni serviti (Itri, Formia, Gaeta, Fondi, Sperlonga, Terracina, Minturno), orari.
- **`schema`:** `LocalBusiness` con lo **stesso `@id`** della home (`#psicoterapeuta`) — non crearne uno nuovo, si duplicherebbe l'entità.

---

## 4. Fix tecnici, oltre alle pagine

### 4.1 Link interni dalla home
Ogni sezione della home che ora esaurisce il tema deve accorciarsi e chiudere con un link alla pagina dedicata ("Approfondisci →"). Senza questi link le pagine nuove nascono orfane e Google le scopre tardi e le pesa poco. Vale in particolare per `#approccio` → `/psicoterapia-online/`, `#expat` → `/psicologo-per-italiani-all-estero/`, `#supervisione` → `/supervisione-clinica/`.

### 4.2 Lingue: il selettore IT/EN/ES non produce URL
Il commutatore in header è i18n lato client (`data-i18n` + `assets/i18n.js`): cambia il testo, **non l'URL**. Per Google esistono solo le versioni italiane. Conseguenza: nessuna possibilità di posizionarsi su query in inglese o spagnolo, a parte `/en/`.
Due strade, da decidere prima di implementare:
- **(a)** Tenere il selettore come comodità per il visitatore e generare in più le versioni EN/ES come pagine vere (`pagine/<slug>-en.html` con `"lingua": "en"` e `"alternati"` corrisposti). È l'unica via che porta traffico.
- **(b)** Non fare nulla e accettare che EN/ES non siano trovabili.
Se si sceglie (a): ricordare che `hreflang` funziona solo a coppie corrisposte — ogni pagina deve dichiarare anche sé stessa, più `x-default`. `build-pagine.js` lo fa già correttamente a partire da `alternati`.

### 4.3 BreadcrumbList della home
Oggi elenca ancore (`/#approccio`, `/#test`, `/#contatti`) come `item`. Le ancore non sono pagine: Google può ignorare l'intero markup. Quando esisteranno le pagine dedicate, sostituire quegli `item` con URL reali, oppure ridurre il breadcrumb della home a una sola voce.

### 4.4 `lastmod` della sitemap
`scriviSitemap()` scrive la data di build su **tutte** le voci. Una sitemap che dichiara sei pagine modificate tutte oggi, ogni volta che si ricompila, perde credibilità come segnale. Usare invece l'`mtime` del file sorgente `pagine/<slug>.html` (e di `index.html` per la home).

### 4.5 Prestazioni / Core Web Vitals
- Google Fonts caricato da CDN in `<head>`: render-blocking. Valutare self-hosting dei due font (Fraunces, Inter) in `assets/` con `font-display: swap`.
- `lucide.js` da `unpkg.com/lucide@latest`: dipendenza esterna non versionata sul percorso critico. Fissare la versione e/o self-hostarla.
- Verificare che ogni `<img>` abbia `width`/`height` espliciti (anti-CLS).

### 4.6 Pagine di fiducia
Mancano `/privacy/` e `/note-legali/` (o `/informativa/`). Sono richieste dal GDPR e contano come segnale E-E-A-T su un sito sanitario. Si creano con lo stesso sistema, `"priorita": "0.3"`.

### 4.7 Fuori dal repo — leve che pesano più del codice
- **Google Business Profile** per lo studio di Itri: è il fattore numero uno per "psicologo vicino a me". Da rivendicare/completare con NAP identico a quello dello schema (`Via Luigi Pirandello 8, 04020 Itri LT`, `+39 345 5032318`).
- **Bing Webmaster Tools** (importa la proprietà da GSC) + IndexNow.
- Coerenza NAP sulle directory di settore (Ordine degli Psicologi del Lazio, GuidaPsicologi, Miodottore): stesso nome, stesso indirizzo, stesso telefono, ovunque.

---

## 5. Checklist di verifica prima di considerare il lavoro chiuso

- [ ] `npm run build:pagine` termina senza errori e stampa tutti gli slug attesi
- [ ] `sitemap.xml` contiene i nuovi URL con `priority` sensata
- [ ] Ogni nuova pagina passa il **Rich Results Test** senza errori sui suoi schema
- [ ] `<title>` ≤ 60 caratteri e `description` ≤ 155 su ogni nuova pagina, tutti diversi fra loro
- [ ] Nessun contenuto duplicato fra pagina dedicata e sezione della home (la sezione va accorciata, non clonata)
- [ ] Link interno dalla home a ogni nuova pagina, e link di ritorno alla home da ogni nuova pagina
- [ ] Lighthouse SEO ≥ 95, Performance ≥ 90 su mobile
- [ ] In GSC → *Controllo URL* → **Richiedi indicizzazione** per ogni nuovo URL
- [ ] Rileggere ogni pagina sanitaria con un occhio deontologico: nessuna promessa di risultato, nessun linguaggio diagnostico rivolto al lettore
