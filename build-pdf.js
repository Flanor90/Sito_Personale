#!/usr/bin/env node
/* ============================================================
   build-pdf.js — stampa le guide scaricabili
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Le guide gratuite che si scaricano dal sito sono PDF, ma il PDF
   non è la sorgente: il testo vive in pdf/<nome>.html, impaginato
   con i colori e i caratteri del brand. Da lì Chrome stampa il file
   che finisce in assets/.

   Tenere la sorgente in HTML significa che una correzione al testo
   si fa dove il testo si legge, non riaprendo un impaginato; e che
   la prossima guida si scrive copiando la precedente.

   COME FUNZIONA

   Serve Chrome (o Chromium) installato: viene avviato senza finestra,
   apre il file e lo stampa.

   I caratteri del brand non arrivano da Google Fonts ma da pdf/font/,
   incorporati nel documento come dati. Costa qualche decina di
   kilobyte, e in cambio la stampa non dipende dalla rete: senza, un
   ambiente che non raggiunge fonts.gstatic.com produrrebbe un PDF
   apparentemente a posto ma scritto con i caratteri di sistema — un
   guasto silenzioso, il peggior tipo.

   USO
     npm run build:pdf
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const RADICE = __dirname;

/* ------------------------------------------------------------
   Cosa stampare
   ------------------------------------------------------------
   `tipo: 'pdf'`     → documento A4 da scaricare
   `tipo: 'immagine'`→ copertina quadrata per la card sul sito
------------------------------------------------------------ */
const LAVORI = [
  {
    tipo: 'pdf',
    sorgente: 'pdf/guida-ia-e-psicoterapia.html',
    uscita: 'assets/guida-ia-e-psicoterapia.pdf'
  },
  {
    tipo: 'immagine',
    sorgente: 'pdf/copertina-guida-ia.html',
    uscita: 'assets/cover-guida-ia.png',
    dimensione: 1200
  },
  // Della guida «Perché è più facile parlarne a una macchina» qui si
  // stampa solo la copertina della card: il PDF nasce dal markdown in
  // SMM_Hub e lo produce tools/genera-guida-pdf.js.
  {
    tipo: 'immagine',
    sorgente: 'pdf/copertina-guida-macchina.html',
    uscita: 'assets/cover-guida-macchina.png',
    dimensione: 1200
  }
];

/* ------------------------------------------------------------
   Trovare Chrome
   ------------------------------------------------------------ */

const CANDIDATI = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

function trovaChrome() {
  const trovato = CANDIDATI.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
  if (!trovato) {
    throw new Error(
      'Non trovo Chrome né Chromium.\n' +
      '  Installa Google Chrome, oppure indica il percorso:\n' +
      '  CHROME_PATH="/percorso/al/browser" npm run build:pdf'
    );
  }
  return trovato;
}

/* ------------------------------------------------------------
   Caratteri incorporati
   ------------------------------------------------------------
   I due file in pdf/font/ sono i sottoinsiemi latini presi da Google
   Fonts (Fraunces e Inter, licenza SIL Open Font). Sono varianti
   "variable": un solo file copre tutti i pesi, per questo la regola
   dichiara un intervallo 100–900 invece di un peso preciso.
------------------------------------------------------------ */

const CARATTERI = [
  { famiglia: 'Fraunces', file: 'pdf/font/fraunces-latin.woff2' },
  { famiglia: 'Inter',    file: 'pdf/font/inter-latin.woff2' }
];

function regoleCaratteri() {
  return CARATTERI.map((c) => {
    const percorso = path.join(RADICE, c.file);
    if (!fs.existsSync(percorso)) {
      throw new Error(
        `Manca ${c.file}.\n` +
        '  I caratteri sono incorporati nel PDF: senza, uscirebbe stampato ' +
        'con i font di sistema senza dirlo.'
      );
    }
    const dati = fs.readFileSync(percorso).toString('base64');
    return `@font-face{font-family:'${c.famiglia}';font-style:normal;` +
           `font-weight:100 900;font-display:block;` +
           `src:url(data:font/woff2;base64,${dati}) format('woff2');}`;
  }).join('\n');
}

/**
 * Scrive accanto al sorgente una copia con i caratteri incorporati al
 * posto del collegamento a Google Fonts. È un file temporaneo: viene
 * cancellato subito dopo la stampa, così in pdf/ resta solo la
 * sorgente vera.
 */
function preparaSorgente(relativo) {
  const originale = path.join(RADICE, relativo);
  let html = fs.readFileSync(originale, 'utf8');

  html = html
    .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/,
             `<style>\n${regoleCaratteri()}\n</style>`);

  const temporaneo = originale.replace(/\.html$/, '.__stampa.html');
  fs.writeFileSync(temporaneo, html);
  return temporaneo;
}

/* ------------------------------------------------------------
   Stampa
   ------------------------------------------------------------ */

function comuni(profilo) {
  return [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    // Servizi che in una stampa non servono e che allungano l'avvio.
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    // Un profilo usa e getta: senza, Chrome rifiuta di partire se ne hai
    // già una finestra aperta con il profilo di sempre.
    `--user-data-dir=${profilo}`,
    // I caratteri arrivano da Google Fonts: senza attesa, la prima riga
    // verrebbe stampata con il ripiego di sistema.
    '--virtual-time-budget=10000'
  ];
}

/**
 * Aspetta che il file esista e abbia smesso di crescere.
 *
 * Serve perché Chrome scrive il PDF e poi resta vivo: l'updater di Google
 * gli tiene aperto un canale e il processo non esce mai da solo. Aspettare
 * `execFileSync` significherebbe aspettare per sempre — quindi guardo il
 * file e chiudo io.
 */
function attendiFile(percorso, timeoutMs) {
  const scadenza = Date.now() + timeoutMs;
  let precedente = -1;
  let stabileDa = 0;
  while (Date.now() < scadenza) {
    execFileSync('/bin/sleep', ['0.4']);
    if (!fs.existsSync(percorso)) { continue; }
    const ora = fs.statSync(percorso).size;
    if (ora > 0 && ora === precedente) {
      stabileDa += 1;
      if (stabileDa >= 2) { return true; }   // due letture uguali: ha finito
    } else {
      stabileDa = 0;
    }
    precedente = ora;
  }
  return false;
}

function stampa(chrome, lavoro, profilo) {
  const temporaneo = preparaSorgente(lavoro.sorgente);
  const url = 'file://' + temporaneo;
  const uscita = path.join(RADICE, lavoro.uscita);
  fs.mkdirSync(path.dirname(uscita), { recursive: true });
  // Un residuo della corsa precedente farebbe credere all'attesa che il
  // lavoro sia già finito.
  if (fs.existsSync(uscita)) { fs.unlinkSync(uscita); }

  const argomenti = lavoro.tipo === 'pdf'
    ? comuni(profilo).concat([`--print-to-pdf=${uscita}`, '--no-pdf-header-footer', url])
    : comuni(profilo).concat([
        `--screenshot=${uscita}`,
        `--window-size=${lavoro.dimensione},${lavoro.dimensione}`,
        url
      ]);

  // Il primo avvio può essere lento (Chrome si porta dietro l'updater e
  // la creazione del profilo): l'attesa è larga apposta.
  process.stdout.write(`  ${lavoro.uscita} … `);
  const processo = spawn(chrome, argomenti, { stdio: 'ignore', detached: true });
  const fatto = attendiFile(uscita, 240000);
  try { process.kill(-processo.pid, 'SIGKILL'); } catch (e) { processo.kill('SIGKILL'); }
  fs.unlinkSync(temporaneo);

  if (!fatto) { throw new Error(`${lavoro.uscita} non è stato prodotto entro quattro minuti.`); }
  const kb = Math.round(fs.statSync(uscita).size / 1024);
  console.log(`fatto (${kb} kB)  ←  ${lavoro.sorgente}`);
}

/* ------------------------------------------------------------
   Esecuzione
   ------------------------------------------------------------ */

function main() {
  const chrome = trovaChrome();
  const profilo = fs.mkdtempSync(path.join(require('os').tmpdir(), 'chrome-stampa-'));
  try {
    LAVORI.forEach((l) => stampa(chrome, l, profilo));
    console.log(`\n${LAVORI.length} file generati.`);
  } finally {
    fs.rmSync(profilo, { recursive: true, force: true });
  }
}

try {
  main();
} catch (e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
