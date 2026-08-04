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
function adatta(blocco) {
  return blocco
    // Il link "salta al contenuto" deve restare interno alla pagina.
    .replace(/href="#main"/g, 'href="§MAIN§"')
    .replace(/href="#/g, 'href="/#')
    .replace(/href="§MAIN§"/g, 'href="#main"')
    .replace(/(src|href)="assets\//g, '$1="/assets/')
    .replace(/(src|href)="(?!\/|https?:|#|mailto:|tel:)([a-z0-9._-]+\.(?:png|jpe?g|webp|svg|ico))"/gi,
             '$1="/$2"');
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
  const immagine = meta.immagine
    ? `${SITO}/${meta.immagine.replace(/^\//, '')}`
    : `${SITO}/assets/alberto-del-bove-psicoterapeuta.webp`;

  // Dati strutturati: le briciole di pane aiutano Google a capire che la
  // pagina è un ramo del sito, non un doppione della home.
  const briciole = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITO}/` },
      { '@type': 'ListItem', position: 2, name: meta.briciola || meta.h1, item: url }
    ]
  };

  const schemi = [briciole].concat(meta.schema ? [meta.schema] : []);

  return `<!DOCTYPE html>
<html lang="it" class="scroll-smooth">
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

  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">

  <meta name="theme-color" content="#1B2A3A">
  <meta name="format-detection" content="telephone=no">

  <meta property="og:type" content="article">
  <meta property="og:locale" content="it_IT">
  <meta property="og:title" content="${meta.ogTitolo || meta.titolo}">
  <meta property="og:description" content="${meta.descrizione}">
  <meta property="og:url" content="${url}">
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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/tailwind.css">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js" defer></script>
</head>
<body class="bg-crema text-inchiostro font-sans antialiased">

${parti.header}

<main id="main" class="pt-24">
${contenuto}
</main>

${parti.footer}

<script src="/assets/i18n.js"></script>
<script src="/assets/analytics.js"></script>
<script src="/assets/newsletter.js"></script>
<script src="/assets/pagine.js"></script>
</body>
</html>
`;
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
    header: adatta(ritaglia(index,
      '<header id="site-header"', '<!-- FINE INTESTAZIONE CONDIVISA -->', 'intestazione')
      .replace(/^/, '<header id="site-header"')),
    footer: adatta(ritaglia(index,
      '<footer class="bg-notte-deep', '<!-- FINE PIÈ DI PAGINA CONDIVISO -->', 'piè di pagina')
      .replace(/^/, '<footer class="bg-notte-deep'))
  };

  const file = fs.readdirSync(SORGENTE).filter((f) => f.endsWith('.html')).sort();
  if (!file.length) { throw new Error('La cartella pagine/ è vuota.'); }

  const fatte = [];

  file.forEach((f) => {
    const pagina = leggiPagina(f);
    const cartella = path.join(RADICE, pagina.meta.slug);
    fs.mkdirSync(cartella, { recursive: true });
    fs.writeFileSync(path.join(cartella, 'index.html'), componi(pagina, parti));
    fatte.push(pagina.meta);
    console.log(`  /${pagina.meta.slug}/  ←  pagine/${f}`);
  });

  scriviSitemap(fatte);
  console.log(`\n${fatte.length} pagine generate, sitemap.xml aggiornata.`);
}

/**
 * La sitemap si rigenera insieme alle pagine: se la scrivessi a mano,
 * prima o poi elencherebbe una pagina che non c'è più (o dimenticherebbe
 * quella nuova, che è il modo più silenzioso di non farsi trovare).
 */
function scriviSitemap(pagine) {
  const oggi = new Date().toISOString().slice(0, 10);
  const voci = [
    { loc: `${SITO}/`, priorita: '1.0', freq: 'monthly' }
  ].concat(pagine.map((p) => ({
    loc: `${SITO}/${p.slug}/`,
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
    <lastmod>${oggi}</lastmod>
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
