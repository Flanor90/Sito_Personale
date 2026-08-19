#!/usr/bin/env node
/* ============================================================
   genera-guida-pdf.js — dal markdown della guida al PDF da regalare
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Le guide gratuite nascono come file markdown nella cartella SMM. Sul
   sito però serve un PDF: è quello che la persona riceve per email in
   cambio del suo indirizzo, e sarà anche l'unica cosa che vedrà del
   lavoro di Alberto prima di decidere se fidarsi. Convertirlo a mano
   ogni volta è il modo migliore per ritrovarsi, alla terza guida, con
   tre impaginazioni diverse.

   COME FUNZIONA

   Il markdown viene convertito in una pagina HTML impaginata per la
   stampa, e Chrome in modalità headless la trasforma in PDF. Chrome è
   già sul Mac e rende i font e le spaziature esattamente come il
   browser: nessuna libreria da installare, nessuna sorpresa tipografica.

   Perché non una libreria PDF: le librerie disegnano il testo riga per
   riga, e la sillabazione, le vedove e gli orfani vanno gestiti a mano.
   Un motore di rendering vero fa tutto questo da sé.

   USO
     node tools/genera-guida-pdf.js <file.md> [nome-file-uscita]

   Il markdown deve cominciare con un blocco di front matter:
     ---
     titolo: "..."
     sottotitolo: "..."
     kicker: "..."
     autore: "..."
     versione: "..."
     ---
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RADICE = path.join(__dirname, '..');

/* ------------------------------------------------------------
   Front matter
   ------------------------------------------------------------ */

function leggiFrontMatter(testo) {
  const m = testo.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { throw new Error('Il file non comincia con un blocco --- di front matter.'); }

  const meta = {};
  m[1].split('\n').forEach((riga) => {
    const c = riga.indexOf(':');
    if (c === -1) { return; }
    const chiave = riga.slice(0, c).trim();
    // I valori sono spesso fra virgolette: le tolgo se ci sono.
    const valore = riga.slice(c + 1).trim().replace(/^["'](.*)["']$/, '$1');
    meta[chiave] = valore;
  });

  return { meta, corpo: testo.slice(m[0].length) };
}

/* ------------------------------------------------------------
   Markdown → HTML
   ------------------------------------------------------------
   Volutamente separato dal convertitore delle newsletter
   (admin/markdown.js): quello produce stili in linea perché i client di
   posta buttano via i fogli di stile, qui invece si stampa e gli stili
   stanno dove devono stare. Stesso markdown, due destinazioni con
   vincoli opposti.
   ------------------------------------------------------------ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(t) {
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«"])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, ' ');
}

function rendi(md) {
  const fuori = [];

  md.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).forEach((blocco) => {
    const b = blocco.trim();
    if (!b) { return; }

    if (/^---+$/.test(b)) { fuori.push('<hr>'); return; }

    const titolo = b.match(/^(#{1,3})\s+(.*)$/);
    if (titolo && !b.includes('\n')) {
      const liv = titolo[1].length;
      fuori.push(`<h${liv}>${inline(titolo[2])}</h${liv}>`);
      return;
    }

    if (/^>/.test(b)) {
      fuori.push(`<blockquote>${inline(b.replace(/^>\s?/gm, ''))}</blockquote>`);
      return;
    }

    if (/^[-*]\s+/.test(b)) {
      const voci = [];
      b.split('\n').forEach((r) => {
        if (/^[-*]\s+/.test(r)) { voci.push(r.replace(/^[-*]\s+/, '')); }
        else if (voci.length) { voci[voci.length - 1] += ' ' + r.trim(); }
      });
      fuori.push('<ul>' + voci.map((v) => `<li>${inline(v)}</li>`).join('') + '</ul>');
      return;
    }

    if (/^\d+\.\s+/.test(b)) {
      const voci = [];
      b.split('\n').forEach((r) => {
        if (/^\d+\.\s+/.test(r)) { voci.push(r.replace(/^\d+\.\s+/, '')); }
        else if (voci.length) { voci[voci.length - 1] += ' ' + r.trim(); }
      });
      fuori.push('<ol>' + voci.map((v) => `<li>${inline(v)}</li>`).join('') + '</ol>');
      return;
    }

    // Il titolo H1 del markdown ripete quello della copertina: lo salto.
    fuori.push(`<p>${inline(b)}</p>`);
  });

  return fuori.join('\n');
}

/* ------------------------------------------------------------
   La pagina da stampare
   ------------------------------------------------------------ */

function paginaHtml(meta, contenuto) {
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<title>${esc(meta.titolo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  /* Colori del brand — vedi BRANDBOOK.md §7 */
  :root {
    --notte: #1B2A3A; --mirtillo: #4C507F; --mirtillo-chiaro: #7C81B3;
    --crema: #F7F5F1; --tortora: #E4DFD8; --inchiostro: #2B2B2B;
  }

  @page { size: A4; margin: 22mm 20mm 20mm; }
  /* La copertina è a tutta pagina: niente margini, altrimenti resta
     una cornice bianca attorno al fondo scuro. */
  @page copertina { margin: 0; }

  /* Senza questo Chrome NON stampa i colori di sfondo: la copertina
     uscirebbe bianca, con sopra il testo bianco. Cioè vuota. */
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { margin: 0; font-family: Inter, sans-serif; color: var(--inchiostro);
         font-size: 10.6pt; line-height: 1.62; }

  /* ---------- Copertina ---------- */
  .copertina {
    page: copertina; page-break-after: always;
    height: 297mm; background: var(--notte); color: var(--crema);
    padding: 42mm 24mm; display: flex; flex-direction: column;
  }
  .copertina .kicker {
    font-size: 9pt; letter-spacing: .22em; text-transform: uppercase;
    color: var(--mirtillo-chiaro); margin-bottom: 16mm;
  }
  .copertina h1 {
    /* Il "display" va dichiarato qui: più sotto c'è "h1 { display: none }"
       per i titoli che il markdown ripete, e senza questa riga nasconde
       anche il titolo di copertina — che è la prima cosa che si vede. */
    display: block;
    font-family: Fraunces, Georgia, serif; font-weight: 400;
    font-size: 33pt; line-height: 1.14; margin: 0 0 8mm; color: #fff;
  }
  .copertina .sotto { font-size: 13pt; line-height: 1.5; color: rgba(247,245,241,.78); max-width: 118mm; }
  .copertina .piede { margin-top: auto; }
  .copertina .marchio {
    font-family: Fraunces, Georgia, serif; font-size: 19pt; letter-spacing: .06em; color: #fff;
  }
  .copertina .marchio b { color: var(--mirtillo-chiaro); font-weight: 400; }
  .copertina .autore {
    font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase;
    color: rgba(247,245,241,.6); margin-top: 3mm;
  }

  /* ---------- Testo ---------- */
  h1 { display: none; }  /* nel corpo no: il titolo vive sulla copertina */
  h2 {
    font-family: Fraunces, Georgia, serif; font-weight: 400; font-size: 17pt;
    line-height: 1.25; color: var(--notte); margin: 9mm 0 3.5mm;
    page-break-after: avoid; break-after: avoid;
  }
  h3 { font-size: 11.5pt; font-weight: 700; color: var(--notte); margin: 6mm 0 2mm;
       page-break-after: avoid; }
  p { margin: 0 0 3.6mm; text-align: justify; hyphens: auto; }
  strong { color: var(--notte); font-weight: 600; }
  em { font-style: italic; }
  a { color: var(--mirtillo); text-decoration: none; }

  ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin-bottom: 2.2mm; }
  li::marker { color: var(--mirtillo-chiaro); }

  blockquote {
    margin: 0 0 4mm; padding: 1mm 0 1mm 5mm;
    border-left: 2px solid var(--mirtillo-chiaro); color: #5c5c5c;
  }

  hr { border: 0; border-top: 1px solid var(--tortora); margin: 7mm 0; }

  /* Un titolo non deve restare da solo in fondo alla pagina, e un
     paragrafo non deve lasciare una riga sola di là: sono le due cose
     che fanno sembrare artigianale un PDF altrimenti curato. */
  p, li { orphans: 3; widows: 3; }

  /* ---------- Chiusura ---------- */
  .chiusura {
    margin-top: 10mm; padding: 6mm 7mm; background: var(--crema);
    border-left: 3px solid var(--mirtillo-chiaro); border-radius: 3mm;
    font-size: 9.2pt; line-height: 1.55; color: #4a4a4a;
    page-break-inside: avoid;
  }
  .chiusura strong { color: var(--notte); }
</style></head>
<body>

<section class="copertina">
  <div class="kicker">${esc(meta.kicker || 'Guida gratuita')}</div>
  <h1>${esc(meta.titolo)}</h1>
  <p class="sotto">${esc(meta.sottotitolo || '')}</p>
  <div class="piede">
    <div class="marchio">A<b>B</b></div>
    <div class="autore">${esc(meta.autore || 'Alberto Del Bove')}</div>
  </div>
</section>

${contenuto}

</body></html>`;
}

/* ------------------------------------------------------------
   Esecuzione
   ------------------------------------------------------------ */

function main() {
  const sorgente = process.argv[2];
  if (!sorgente) {
    throw new Error('Uso: node tools/genera-guida-pdf.js <file.md> [nome-uscita.pdf]');
  }
  if (!fs.existsSync(CHROME)) {
    throw new Error(`Non trovo Google Chrome in ${CHROME}. Serve per la stampa in PDF.`);
  }

  const { meta, corpo } = leggiFrontMatter(fs.readFileSync(sorgente, 'utf8'));

  // Il primo H1 e il sottotitolo in corsivo ripetono la copertina: li tolgo.
  const pulito = corpo
    .replace(/^\s*#\s+.*$/m, '')
    .replace(/^\s*\*[^*\n]+\*\s*$/m, '')
    .replace(/^\s*---\s*$/m, '');

  const nome = process.argv[3] ||
    'guida-' + path.basename(sorgente, '.md')
      .replace(/^GUIDA_/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.pdf';

  const uscita = path.join(RADICE, 'assets', nome);
  const temporaneo = path.join(require('os').tmpdir(), `guida-${Date.now()}.html`);

  fs.writeFileSync(temporaneo, paginaHtml(meta, rendi(pulito)));

  try {
    execFileSync(CHROME, [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      // Un profilo usa e getta: senza, Chrome può rifiutarsi di partire
      // se una finestra normale è già aperta.
      `--user-data-dir=${require('os').tmpdir()}/chrome-guide-${Date.now()}`,
      // Il tempo serve a far arrivare i font dal web prima della stampa.
      '--virtual-time-budget=8000',
      `--print-to-pdf=${uscita}`,
      `file://${temporaneo}`,
    ], {
      stdio: 'pipe',
      // Chrome headless scrive il PDF e poi, su macOS, a volte non
      // esce: resta appeso senza che il file abbia niente che non va.
      // Il timeout lo termina; se il PDF c'è, ha finito il suo lavoro.
      timeout: 90_000,
      killSignal: 'SIGKILL',
    });
  } catch (e) {
    if (!fs.existsSync(uscita)) { throw e; }
    // Il file c'è: Chrome ha stampato e poi si è impuntato. Va bene così.
  }

  fs.unlinkSync(temporaneo);

  const kb = Math.round(fs.statSync(uscita).size / 1024);
  console.log(`  assets/${nome}  (${kb} KB)`);
  console.log(`  titolo:  ${meta.titolo}`);
  if (meta.fonte_email) { console.log(`  fonte:   ${meta.fonte_email}`); }
}

try {
  main();
} catch (e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
