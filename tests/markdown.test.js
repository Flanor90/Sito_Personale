/* ============================================================
   Test automatici per admin/markdown.js
   ------------------------------------------------------------
   Questo file converte quello che scrivo in ciò che parte via email a
   centinaia di persone: un errore qui non si corregge dopo l'invio.
   I test coprono soprattutto i due modi in cui può fare danno —
   HTML che passa senza essere neutralizzato, e link che eseguono codice.
   ============================================================ */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MD = require('../admin/markdown.js');

test('espone l\'API pubblica attesa', () => {
  ['rendi', 'soloTesto', 'minutiDiLettura', 'urlSicuro', 'esc']
    .forEach((k) => assert.ok(k in MD, `manca ${k}`));
});

/* ---------------- Sicurezza ---------------- */

test('l\'HTML scritto nel testo viene mostrato, non eseguito', () => {
  const out = MD.rendi('Attenzione <script>alert(1)</script> qui');
  assert.ok(!out.includes('<script>'), 'il tag script non deve sopravvivere');
  assert.ok(out.includes('&lt;script&gt;'), 'deve comparire come testo');
});

test('un tag immagine con gestore di eventi non passa', () => {
  const out = MD.rendi('<img src=x onerror="alert(1)">');
  assert.ok(!out.includes('<img'), 'nessun tag immagine reale');
  assert.ok(out.includes('&lt;img'), 'deve restare testo');
});

test('i link javascript: diventano testo semplice', () => {
  const out = MD.rendi('[clicca](javascript:alert(1))');
  assert.ok(!out.includes('javascript:'), 'nessun indirizzo eseguibile');
  assert.ok(!out.includes('<a '), 'nessun link creato');
  assert.ok(out.includes('clicca'), 'il testo resta leggibile');
});

test('i link data: non passano', () => {
  const out = MD.rendi('[x](data:text/html,<script>alert(1)</script>)');
  assert.ok(!out.includes('<a '), 'nessun link creato');
});

test('urlSicuro accetta solo schemi innocui', () => {
  ['https://esempio.it', 'http://esempio.it', 'mailto:a@b.it', 'tel:+39333', '/pagina', '#sezione']
    .forEach((u) => assert.ok(MD.urlSicuro(u), `dovrebbe accettare ${u}`));
  ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd']
    .forEach((u) => assert.ok(!MD.urlSicuro(u), `dovrebbe rifiutare ${u}`));
});

/* ---------------- Conversione ---------------- */

test('i titoli diventano h1/h2/h3 con lo stile in linea', () => {
  assert.match(MD.rendi('# Titolo'), /^<h1 style="[^"]+">Titolo<\/h1>$/);
  assert.match(MD.rendi('## Sotto'), /^<h2 style="[^"]+">Sotto<\/h2>$/);
  assert.match(MD.rendi('### Terzo'), /^<h3 style="[^"]+">Terzo<\/h3>$/);
});

test('ogni elemento porta lo stile in linea (i client di posta buttano i CSS)', () => {
  const out = MD.rendi('Un paragrafo.\n\n- una voce\n\n> una citazione');
  ['<p style="', '<ul style="', '<li style="', '<blockquote style="']
    .forEach((frammento) => assert.ok(out.includes(frammento), `manca ${frammento}`));
});

test('grassetto e corsivo', () => {
  assert.ok(MD.rendi('**forte**').includes('<strong>forte</strong>'));
  assert.ok(MD.rendi('*piano*').includes('<em>piano</em>'));
  assert.ok(MD.rendi('__forte__').includes('<strong>forte</strong>'));
});

test('un link valido diventa un tag a con href', () => {
  const out = MD.rendi('Vedi [il sito](https://esempio.it).');
  assert.ok(out.includes('href="https://esempio.it"'));
  assert.ok(out.includes('>il sito</a>'));
});

test('elenco puntato e numerato', () => {
  const puntato = MD.rendi('- uno\n- due');
  assert.ok(puntato.startsWith('<ul'));
  assert.equal((puntato.match(/<li/g) || []).length, 2);

  const numerato = MD.rendi('1. uno\n2. due');
  assert.ok(numerato.startsWith('<ol'));
  assert.equal((numerato.match(/<li/g) || []).length, 2);
});

test('la citazione tiene più righe insieme', () => {
  const out = MD.rendi('> prima\n> seconda');
  assert.equal((out.match(/<blockquote/g) || []).length, 1);
  assert.ok(out.includes('prima<br>seconda'));
});

test('tre trattini diventano una linea', () => {
  assert.match(MD.rendi('---'), /^<hr style="[^"]+">$/);
});

test('le righe vuote separano i paragrafi', () => {
  const out = MD.rendi('Primo.\n\nSecondo.');
  assert.equal((out.match(/<p /g) || []).length, 2);
});

test('un a capo singolo resta un a capo, non un nuovo paragrafo', () => {
  const out = MD.rendi('Prima riga\nseconda riga');
  assert.equal((out.match(/<p /g) || []).length, 1);
  assert.ok(out.includes('<br>'));
});

test('un testo vuoto non produce HTML', () => {
  assert.equal(MD.rendi(''), '');
  assert.equal(MD.rendi('   \n\n  '), '');
  assert.equal(MD.rendi(null), '');
  assert.equal(MD.rendi(undefined), '');
});

/* ---------------- Versione testuale ---------------- */

test('soloTesto toglie i segni ma conserva gli indirizzi dei link', () => {
  const t = MD.soloTesto('## Titolo\n\nVedi [il sito](https://esempio.it) e **nota**.');
  assert.ok(!t.includes('##'));
  assert.ok(!t.includes('**'));
  assert.ok(t.includes('il sito (https://esempio.it)'), 'l\'indirizzo non deve perdersi');
});

test('soloTesto trasforma gli elenchi in punti leggibili', () => {
  assert.ok(MD.soloTesto('- uno\n- due').includes('• uno'));
});

test('minutiDiLettura restituisce almeno un minuto', () => {
  assert.equal(MD.minutiDiLettura(''), 1);
  assert.equal(MD.minutiDiLettura('due parole'), 1);
  assert.equal(MD.minutiDiLettura(new Array(400).fill('parola').join(' ')), 2);
});

/* ---------------- Casi limite ---------------- */

test('gli asterischi non accoppiati non rompono il risultato', () => {
  const out = MD.rendi('Costa 5 * 3 euro e * resta così');
  assert.ok(out.includes('<p '), 'resta comunque un paragrafo valido');
});

test('le e commerciali vengono codificate una volta sola', () => {
  const out = MD.rendi('Tizio & Caio');
  assert.ok(out.includes('Tizio &amp; Caio'));
  assert.ok(!out.includes('&amp;amp;'), 'nessuna doppia codifica');
});
