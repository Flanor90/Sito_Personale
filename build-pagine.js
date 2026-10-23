#!/usr/bin/env node
/* ============================================================
   build-pagine.js — assembla le pagine dedicate
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Il sito è sempre stato una pagina sola, con le sezioni raggiunte da
   #ancore. Funziona per chi arriva dalla home e scorre, ma ha due
   difetti seri:

   1. Condividere una sezione è scomodo. "albertodelbove-psicologo.it/#test"
      si legge male e si scrive peggio, al telefono o a voce.

   2. Soprattutto: per Google esiste UNA pagina sola. Trecento kilobyte
      di contenuti — quattro test, sei compendi, casi di studio — competono
      tutti sotto un unico titolo. Chi cerca "test ADHD gratuito" non ha
      nessuna pagina su cui atterrare, perché quella pagina non esiste:
      esiste un pezzo di una pagina che parla anche di molte altre cose.

   Da qui le pagine dedicate: /test/, /compendi/, /newsletter/. Non sono
   rimbalzi verso le ancore — quelli Google li tratta come pagine vuote e
   non portano un visitatore in più. Sono pagine vere, con contenuti loro,
   che rispondono a una domanda precisa e da lì accompagnano alla home.

   COME FUNZIONA

   Intestazione e piè di pagina esistono in un posto solo: dentro
   index.html, fra i marcatori "INIZIO/FINE ... CONDIVISA". Questo script
   li ritaglia e li incolla in ogni pagina. Se domani cambia una voce del
   menu, cambia in index.html e tutte le pagine si aggiornano al prossimo
   `npm run build:pagine`. Nessuna copia da tenere allineata a mano.

   USO
     npm run build:pagine
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = __dirname;
const SORGENTE = path.join(RADICE, 'pagine');
const SITO = 'https://www.albertodelbove-psicologo.it';

/* ------------------------------------------------------------
   1. Ritaglio le parti condivise dalla home
   ------------------------------------------------------------ */

function ritaglia(html, inizio, fine, nome) {
  const a = html.indexOf(inizio);
  const b = html.indexOf(fine);
  if (a === -1 || b === -1) {
    // Meglio fermarsi che generare pagine mutilate senza accorgersene.
    throw new Error(
      `Non trovo i marcatori di ${nome} in index.html.\n` +
      `Cerco "${inizio}" e "${fine}". Se hai riorganizzato la pagina, ` +
      `rimetti i commenti marcatori attorno al blocco.`
    );
  }
  return html.slice(a + inizio.length, b).trim();
}

/**
 * Adatta un blocco preso dalla home per una pagina in sottocartella.
 *
 * Due cose vanno riscritte, e sono entrambe silenziose se ci si dimentica:
 * i link alle ancore (da "#chi-sono" a "/#chi-sono", altrimenti da
 * /test/ cercherebbero una sezione che lì non esiste) e i percorsi dei
 * file (da "assets/…" a "/assets/…", altrimenti diventerebbero
 * "/test/assets/…" e non caricherebbero).
 */
function adatta(blocco, lingua) {
  const b = blocco
    // Il link "salta al contenuto" deve restare interno alla pagina.
    .replace(/href="#main"/g, 'href="§MAIN§"')
    .replace(/href="#/g, 'href="/#')
    .replace(/href="§MAIN§"/g, 'href="#main"')
    .replace(/(src|href)="assets\//g, '$1="/assets/')
    .replace(/(src|href)="(?!\/|https?:|#|mailto:|tel:)([a-z0-9._-]+\.(?:png|jpe?g|webp|svg|ico))"/gi,
             '$1="/$2"');

  if (!lingua || lingua === 'it') { return b; }

  // Da una pagina non italiana, i link del menu devono riportare alla home
  // NELLA STESSA LINGUA. Senza questo, chi naviga da /en/ finisce sulla home
  // in italiano: l'inglese non era mai stato salvato come sua scelta, ed è
  // giusto così — non gliel'abbiamo chiesto.
  return b
    .replace(/href="\/#/g, `href="/?lang=${lingua}#`)
    .replace(/href="\/"/g, `href="/?lang=${lingua}"`);
}

/* ------------------------------------------------------------
   2. Leggo le pagine sorgente
   ------------------------------------------------------------ */

/**
 * Ogni file in pagine/ comincia con un blocco di metadati in un commento:
 *
 *   <!--METADATI
 *   { "slug": "test", "titolo": "…", "descrizione": "…" }
 *   -->
 *
 * Il resto del file è il contenuto, che finisce dentro <main>.
 *
 * Facoltativo: "script": ["lettore.js"] carica in fondo alla pagina i
 * file di assets/ elencati, dopo quelli comuni. Serve alle pagine che
 * hanno bisogno di qualcosa in più, come la finestra di lettura.
 */
function leggiPagina(file) {
  const grezzo = fs.readFileSync(path.join(SORGENTE, file), 'utf8');
  const m = grezzo.match(/<!--METADATI\s*([\s\S]*?)-->/);
  if (!m) { throw new Error(`${file}: manca il blocco <!--METADATI ... -->`); }

  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`${file}: i metadati non sono JSON valido — ${e.message}`);
  }

  ['slug', 'titolo', 'descrizione'].forEach((c) => {
    if (!meta[c]) { throw new Error(`${file}: manca il campo "${c}" nei metadati`); }
  });

  return { meta, contenuto: grezzo.slice(m.index + m[0].length).trim() };
}

/* ------------------------------------------------------------
   3. Compongo la pagina
   ------------------------------------------------------------ */

function componi({ meta, contenuto }, parti) {
  const url = `${SITO}/${meta.slug}/`;
  const lingua = meta.lingua || 'it';
  const immagine = meta.immagine
    ? `${SITO}/${meta.immagine.replace(/^\//, '')}`
    : `${SITO}/assets/alberto-del-bove-psicoterapeuta.webp`;

  /* ------------------------------------------------------------
     hreflang: dire a Google che due pagine sono la stessa cosa in
     lingue diverse.
     ------------------------------------------------------------
     Senza queste righe, la pagina inglese e quella italiana sembrano
     due contenuti scollegati, e Google può mostrare quella sbagliata a
     seconda del paese. Con queste, sa che sono varianti e sceglie in
     base alla lingua di chi cerca.

     Ogni pagina deve elencare ANCHE se stessa: è un requisito, non una
     ridondanza — una pagina che non si autodichiara viene ignorata.
     x-default indica dove mandare chi non rientra in nessuna lingua
     dichiarata; qui è l'italiano, che è la versione principale.
  ------------------------------------------------------------ */
  const alternati = meta.alternati
    ? Object.entries(meta.alternati)
      .map(([codice, percorso]) =>
        `  <link rel="alternate" hreflang="${codice}" href="${SITO}${percorso}">`)
      .join('\n') + `\n  <link rel="alternate" hreflang="x-default" href="${
        SITO}${meta.alternati.it ?? '/'}">`
    : '';

  // Dati strutturati: le briciole di pane aiutano Google a capire che la
  // pagina è un ramo del sito, non un doppione della home.
  // Gli articoli stanno sotto /articoli/ anche nelle briciole, così
  // Google mostra «Home › Articoli › titolo» invece di due livelli soli.
  const livelli = [{ name: 'Home', item: `${SITO}/` }];
  if (meta.articolo) { livelli.push({ name: 'Articoli', item: `${SITO}/articoli/` }); }
  livelli.push({ name: meta.briciola || meta.h1, item: url });
  const briciole = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: livelli.map((l, i) => ({ '@type': 'ListItem', position: i + 1, ...l }))
  };

  // `schema` accetta un oggetto o un elenco: una pagina sanitaria di solito
  // ne vuole due (MedicalWebPage per il contenuto, FAQPage per le domande),
  // e prima l'elenco finiva annidato dentro un altro elenco — JSON-LD
  // formalmente valido che Google però scarta senza dire niente.
  const extra = meta.schema
    ? (Array.isArray(meta.schema) ? meta.schema : [meta.schema])
    : [];
  const schemi = [briciole].concat(meta.articolo ? [schemaArticolo(meta, url, immagine)] : [], extra);

  return `<!DOCTYPE html>
<html lang="${lingua}" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Pagina generata da build-pagine.js a partire da pagine/${meta.slug}.html.
       Non modificarla qui: le modifiche verrebbero perse alla prossima
       generazione. Il contenuto sta in pagine/${meta.slug}.html. -->

  <title>${meta.titolo}</title>
  <meta name="description" content="${meta.descrizione}">
  <meta name="author" content="Alberto Del Bove">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="Articoli di Alberto Del Bove" href="${SITO}/articoli/feed.xml">
${alternati}

  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">

  <meta name="theme-color" content="#1B2A3A">
  <meta name="format-detection" content="telephone=no">

  <meta property="og:type" content="article">
  <meta property="og:locale" content="${lingua === 'en' ? 'en_GB' : lingua === 'es' ? 'es_ES' : 'it_IT'}">
  <meta property="og:title" content="${meta.ogTitolo || meta.titolo}">
  <meta property="og:description" content="${meta.descrizione}">
  <meta property="og:url" content="${url}">${meta.articolo ? `
  <meta property="article:published_time" content="${meta.articolo.data}">
  <meta property="article:author" content="Alberto Del Bove">` : ''}
  <meta property="og:image" content="${immagine}">
  <meta property="og:site_name" content="Alberto Del Bove — Psicoterapeuta">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.ogTitolo || meta.titolo}">
  <meta name="twitter:description" content="${meta.descrizione}">
  <meta name="twitter:image" content="${immagine}">

  <script type="application/ld+json">
${JSON.stringify(schemi.length === 1 ? schemi[0] : schemi, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/tailwind.css">
  <script src="https://unpkg.com/lucide@1.28.0/dist/umd/lucide.js" defer></script>
</head>
<body class="pagina-lettura bg-crema text-inchiostro font-sans antialiased">

${adatta(parti.header, lingua)}

<main id="main" class="pt-24">
${contenuto}
</main>

${adatta(parti.footer, lingua)}

<script src="/assets/i18n.js"></script>
<script src="/assets/analytics.js"></script>
<script src="/assets/consenso.js"></script>
<script src="/assets/newsletter.js"></script>
<script src="/assets/pagine.js"></script>
${(meta.script || []).map(f => `<script src="/assets/${f}"></script>`).join('\n')}
</body>
</html>
`;
}

/**
 * Gli articoli dichiarano nei metadati un blocco "articolo":
 *
 *   "articolo": { "data": "2026-10-23", "categoria": "Ansia",
 *                 "sommario": "Due righe per l'elenco." }
 *
 * Da lì escono, senza scriverli a mano ogni volta, lo schema BlogPosting
 * per Google, la voce nell'elenco di /articoli/ e quella nel feed RSS.
 * Un articolo nuovo è quindi un file solo in pagine/.
 */
function schemaArticolo(meta, url, immagine) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.h1 || meta.ogTitolo || meta.titolo,
    description: meta.descrizione,
    url,
    mainEntityOfPage: url,
    image: immagine,
    inLanguage: meta.lingua || 'it',
    datePublished: meta.articolo.data,
    dateModified: meta.articolo.aggiornato || meta.articolo.data,
    articleSection: meta.articolo.categoria,
    author: {
      '@type': 'Person',
      name: 'Alberto Del Bove',
      jobTitle: 'Psicologo e psicoterapeuta psicoanalitico',
      identifier: 'Ordine degli Psicologi del Lazio n. 23754',
      url: `${SITO}/`
    },
    publisher: { '@id': `${SITO}/#psicoterapeuta` }
  };
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
  'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function dataLeggibile(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return `${g} ${MESI[m - 1]} ${a}`;
}

function articoliInOrdine(pagine) {
  return pagine
    .filter((p) => p.articolo)
    .sort((a, b) => b.articolo.data.localeCompare(a.articolo.data));
}

/** L'elenco che sostituisce <!--ELENCO-ARTICOLI--> nella pagina /articoli/. */
function elencoArticoli(pagine) {
  return articoliInOrdine(pagine).map((p) => `
    <article class="border-t border-tortora pt-7 pb-9">
      <p class="text-xs font-semibold uppercase tracking-[0.15em] text-mirtillo-700 mb-2">${p.articolo.categoria} <span class="text-inchiostro/45 font-normal normal-case tracking-normal">· <time datetime="${p.articolo.data}">${dataLeggibile(p.articolo.data)}</time></span></p>
      <h2 class="font-serif text-2xl sm:text-[1.7rem] leading-snug text-notte mb-3"><a href="/${p.slug}/" class="hover:text-mirtillo-700 transition-colors">${p.h1 || p.ogTitolo || p.titolo}</a></h2>
      <p class="leading-relaxed text-inchiostro/75 mb-3">${p.articolo.sommario || p.descrizione}</p>
      <a href="/${p.slug}/" class="inline-flex items-center gap-1.5 text-sm font-semibold text-mirtillo-700 hover:text-notte transition-colors">Leggi l'articolo <i data-lucide="arrow-right" class="w-4 h-4" aria-hidden="true"></i></a>
    </article>`).join('\n');
}

/**
 * Le pagine d'area (ansia, burnout, coppia…) mostrano gli articoli che le
 * riguardano: un articolo dichiara "area": "/ansia-e-attacchi-di-panico/"
 * nel blocco "articolo", e la pagina d'area mette <!--ARTICOLI-COLLEGATI-->
 * dove vuole l'elenco. Finché non c'è nessun articolo pubblicato per
 * quell'area, il segnaposto sparisce senza lasciare un riquadro vuoto.
 */
function articoliCollegati(pagine, slugArea) {
  const collegati = articoliInOrdine(pagine)
    .filter((p) => p.articolo.area === `/${slugArea}/`);
  if (!collegati.length) { return ''; }
  return `<section class="py-12" aria-labelledby="h-letture">
  <div class="max-w-3xl mx-auto px-5">
    <h2 id="h-letture" class="font-serif text-2xl text-notte mb-5">Per approfondire</h2>
    <ul class="space-y-3">
${collegati.map((p) => `      <li><a href="/${p.slug}/" class="group flex items-start gap-2 text-lg text-notte hover:text-mirtillo-700 transition-colors"><i data-lucide="arrow-right" class="w-5 h-5 mt-1 shrink-0 text-mirtillo-600" aria-hidden="true"></i><span class="underline underline-offset-4 decoration-tortora-dark group-hover:decoration-mirtillo-600">${p.h1 || p.ogTitolo || p.titolo}</span></a></li>`).join('\n')}
    </ul>
  </div>
</section>`;
}

/**
 * La home non è generata da questo script, ma ha un riquadro «Ultimi
 * articoli» fra due marcatori. Lo riscrivo a ogni build, così quando il
 * lunedì esce un articolo compare anche lì, senza toccare index.html a mano.
 */
const ULTIMI_INIZIO = '<!--INIZIO ULTIMI ARTICOLI-->';
const ULTIMI_FINE = '<!--FINE ULTIMI ARTICOLI-->';

function aggiornaUltimiInHome(pagine) {
  const file = path.join(RADICE, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf(ULTIMI_INIZIO);
  const b = html.indexOf(ULTIMI_FINE);
  if (a === -1 || b === -1) { return; }
  const ultimi = articoliInOrdine(pagine).slice(0, 3);
  const blocco = ultimi.length ? `
        <div class="mb-14 reveal">
          <div class="flex items-baseline justify-between gap-4 mb-5">
            <h3 class="font-serif text-2xl text-notte">Ultimi articoli</h3>
            <a href="/articoli/" class="shrink-0 text-sm font-semibold text-mirtillo-700 hover:text-notte transition-colors">Tutti gli articoli e le guide</a>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
${ultimi.map((p) => `            <a href="/${p.slug}/" class="group block bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p class="text-xs font-semibold uppercase tracking-[0.15em] text-mirtillo-700 mb-2">${p.articolo.categoria}</p>
              <p class="font-serif text-xl leading-snug text-notte group-hover:text-mirtillo-700 transition-colors mb-3">${p.h1 || p.ogTitolo || p.titolo}</p>
              <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-mirtillo-700">Leggi l'articolo <i data-lucide="arrow-right" class="w-4 h-4" aria-hidden="true"></i></span>
            </a>`).join('\n')}
          </div>
        </div>
        ` : '\n        ';
  const nuovo = html.slice(0, a + ULTIMI_INIZIO.length) + blocco + html.slice(b);
  if (nuovo !== html) { fs.writeFileSync(file, nuovo); }
}

function scriviFeed(pagine) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const voci = articoliInOrdine(pagine).map((p) => `  <item>
    <title>${esc(p.h1 || p.ogTitolo || p.titolo)}</title>
    <link>${SITO}/${p.slug}/</link>
    <guid>${SITO}/${p.slug}/</guid>
    <pubDate>${new Date(p.articolo.data + 'T08:00:00Z').toUTCString()}</pubDate>
    <category>${esc(p.articolo.categoria)}</category>
    <description>${esc(p.articolo.sommario || p.descrizione)}</description>
  </item>`).join('\n');
  fs.writeFileSync(path.join(RADICE, 'articoli', 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generato da build-pagine.js: non modificare a mano. -->
<rss version="2.0">
<channel>
  <title>Alberto Del Bove, psicoterapeuta: articoli</title>
  <link>${SITO}/articoli/</link>
  <description>Brevi letture su sintomi, relazioni e psicoterapia, scritte da uno psicoterapeuta psicoanalitico.</description>
  <language>it</language>
${voci}
</channel>
</rss>
`);
}

/* ------------------------------------------------------------
   4. Esecuzione
   ------------------------------------------------------------ */

function main() {
  const index = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');

  // I marcatori di apertura contengono una nota lunga più righe; per
  // questo taglio a partire dal tag vero e proprio, che è inequivocabile,
  // e uso i marcatori solo per delimitare la fine.
  const parti = {
    header: ritaglia(index,
      '<header id="site-header"', '<!-- FINE INTESTAZIONE CONDIVISA -->', 'intestazione')
      .replace(/^/, '<header id="site-header"'),
    footer: ritaglia(index,
      '<footer class="relative bg-notte-deep', '<!-- FINE PIÈ DI PAGINA CONDIVISO -->', 'piè di pagina')
      .replace(/^/, '<footer class="relative bg-notte-deep')
  };

  const file = fs.readdirSync(SORGENTE).filter((f) => f.endsWith('.html')).sort();
  if (!file.length) { throw new Error('La cartella pagine/ è vuota.'); }

  const fatte = [];
  /* Un articolo con una data futura resta in pagine/ ma non viene
     pubblicato: niente pagina, niente sitemap, niente elenco. Così si
     possono scrivere più articoli insieme e farli uscire uno alla
     settimana; la build del lunedì (.github/workflows/pubblica-articoli.yml)
     li fa comparire quando arriva la loro data. Con BOZZE=1 si vedono
     tutti, per controllarli in locale. */
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const lette = file.map((f) => [f, leggiPagina(f)]).filter(([f, p]) => {
    const inAttesa = p.meta.articolo && p.meta.articolo.data > oggi;
    if (inAttesa && !process.env.BOZZE) {
      console.log(`  (in attesa fino al ${p.meta.articolo.data})  pagine/${f}`);
      // Se una build con BOZZE=1 l'aveva già generata, la tolgo: non deve
      // finire online prima della sua data con il prossimo commit.
      const generata = path.join(RADICE, p.meta.slug, 'index.html');
      if (fs.existsSync(generata) &&
          fs.readFileSync(generata, 'utf8').includes('Pagina generata da build-pagine.js')) {
        fs.rmSync(path.join(RADICE, p.meta.slug), { recursive: true });
      }
      return false;
    }
    return true;
  });
  const elenco = elencoArticoli(lette.map(([, p]) => p.meta));

  lette.forEach(([f, pagina]) => {
    pagina.contenuto = pagina.contenuto
      .replace('<!--ELENCO-ARTICOLI-->', elenco)
      .replace('<!--ARTICOLI-COLLEGATI-->',
        articoliCollegati(lette.map(([, p]) => p.meta), pagina.meta.slug));
    const cartella = path.join(RADICE, pagina.meta.slug);
    fs.mkdirSync(cartella, { recursive: true });
    fs.writeFileSync(path.join(cartella, 'index.html'), componi(pagina, parti));
    fatte.push(pagina.meta);
    console.log(`  /${pagina.meta.slug}/  ←  pagine/${f}`);
  });

  scriviSitemap(fatte);
  aggiornaUltimiInHome(fatte);
  if (fs.existsSync(path.join(RADICE, 'articoli'))) { scriviFeed(fatte); }
  console.log(`\n${fatte.length} pagine generate, sitemap.xml aggiornata.`);
}

/**
 * La sitemap si rigenera insieme alle pagine: se la scrivessi a mano,
 * prima o poi elencherebbe una pagina che non c'è più (o dimenticherebbe
 * quella nuova, che è il modo più silenzioso di non farsi trovare).
 */
function scriviSitemap(pagine) {
  /**
   * Data di ultima modifica presa dal FILE, non dal momento della build.
   *
   * Prima qui c'era la data di oggi su tutte le voci: bastava ricompilare
   * per dichiarare a Google che sei pagine erano cambiate tutte insieme.
   * Ripetuto qualche volta, quel segnale smette di valere — e vale anche
   * quando è vero. Meglio dire la verità: quando è stato toccato il
   * sorgente di quella pagina.
   */
  const modificato = (percorso) => {
    // Prima la data dell'ultimo commit che ha toccato il file: è stabile
    // anche sulla build automatica del lunedì, dove un checkout appena
    // fatto darebbe a ogni file la data di oggi. Se il file non è ancora
    // in un commit, la data di modifica sul disco.
    try {
      const daGit = require('child_process')
        .execFileSync('git', ['log', '-1', '--format=%cs', '--', percorso],
          { cwd: RADICE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .trim();
      if (daGit && !require('child_process')
        .execFileSync('git', ['status', '--porcelain', '--', percorso],
          { cwd: RADICE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .trim()) { return daGit; }
    } catch (e) { /* niente git: si passa alla data del file */ }
    try {
      return fs.statSync(percorso).mtime.toISOString().slice(0, 10);
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const voci = [
    {
      loc: `${SITO}/`,
      lastmod: modificato(path.join(RADICE, 'index.html')),
      priorita: '1.0',
      freq: 'monthly'
    }
  ].concat(pagine.map((p) => ({
    loc: `${SITO}/${p.slug}/`,
    lastmod: modificato(path.join(SORGENTE, `${p.slug}.html`)),
    priorita: p.priorita || '0.8',
    freq: p.frequenza || 'monthly'
  })));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generata da build-pagine.js: non modificare a mano.
     Gli URL con #ancora vengono ignorati da Google, per questo la sitemap
     elenca solo pagine vere. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${voci.map((v) => `  <url>
    <loc>${v.loc}</loc>
    <lastmod>${v.lastmod}</lastmod>
    <changefreq>${v.freq}</changefreq>
    <priority>${v.priorita}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(RADICE, 'sitemap.xml'), xml);
}

try {
  main();
} catch (e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
