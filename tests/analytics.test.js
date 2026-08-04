/* ============================================================
   Test automatici per assets/analytics.js
   ------------------------------------------------------------
   Qui non si verifica solo che i conti tornino: si verifica che il file
   NON raccolga ciò che ho promesso di non raccogliere. Un test che
   fallisce su `percorso` è un fastidio; uno che fallisce sulla privacy
   è una promessa rotta ai visitatori.
   ============================================================ */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/analytics.js');

test('espone l\'API pubblica attesa', () => {
  ['vista', 'evento', 'svuota', 'dispositivo', 'browser', 'paese', 'campagna', 'percorso']
    .forEach((k) => assert.ok(k in A, `manca ${k}`));
});

/* ---------------- percorso ---------------- */

test('percorso: l\'ancora della pagina unica conta come pagina a sé', () => {
  assert.equal(A.percorso('/', '#newsletter'), '/newsletter');
  assert.equal(A.percorso('/', '#test'), '/test');
  assert.equal(A.percorso('/', ''), '/');
});

test('percorso: con un indirizzo vero, l\'ancora non lo sporca', () => {
  // Quando le sezioni diventeranno pagine vere, un #ancora interno non
  // deve più creare pagine finte: vince il percorso.
  assert.equal(A.percorso('/newsletter/', '#modulo'), '/newsletter/');
  assert.equal(A.percorso('/compendi/', ''), '/compendi/');
});

test('percorso: i parametri dopo l\'ancora vengono scartati', () => {
  assert.equal(A.percorso('/', '#test?utm_source=instagram'), '/test');
});

test('percorso: regge valori mancanti', () => {
  assert.equal(A.percorso(undefined, undefined), '/');
  assert.equal(A.percorso(null, null), '/');
});

/* ---------------- dispositivo ---------------- */

test('dispositivo: tre fasce dalla larghezza dello schermo', () => {
  assert.equal(A.dispositivo(390), 'mobile');
  assert.equal(A.dispositivo(768), 'tablet');
  assert.equal(A.dispositivo(1440), 'desktop');
  assert.equal(A.dispositivo(0), null);
  assert.equal(A.dispositivo(undefined), null);
});

/* ---------------- browser ---------------- */

test('browser: riconosce i principali senza costruire impronte', () => {
  const casi = [
    ['Mozilla/5.0 ... Chrome/120.0 Safari/537.36', 'Chrome'],
    ['Mozilla/5.0 ... Firefox/121.0', 'Firefox'],
    ['Mozilla/5.0 (Macintosh) ... Version/17.0 Safari/605.1.15', 'Safari'],
    ['Mozilla/5.0 ... Chrome/120.0 Safari/537.36 Edg/120.0', 'Edge'],
    ['Mozilla/5.0 ... Chrome/120.0 Safari/537.36 OPR/106.0', 'Opera'],
    ['qualcosa-di-ignoto', 'Altro'],
    ['', 'Altro']
  ];
  casi.forEach(([ua, atteso]) => assert.equal(A.browser(ua), atteso, ua));
});

test('browser: Edge e Opera non vengono scambiati per Chrome', () => {
  // Entrambi dichiarano "Chrome" nello user agent: l'ordine dei controlli
  // dentro la funzione è ciò che li tiene distinti.
  assert.equal(A.browser('Chrome/120 Edg/120'), 'Edge');
  assert.equal(A.browser('Chrome/120 OPR/106'), 'Opera');
});

/* ---------------- paese ---------------- */

test('paese: ricavato dalla lingua del browser, non dalla posizione', () => {
  assert.equal(A.paese('it-IT'), 'IT');
  assert.equal(A.paese('en-GB'), 'GB');
  assert.equal(A.paese('es_ES'), 'ES');
});

test('paese: una lingua senza regione non inventa un paese', () => {
  assert.equal(A.paese('it'), null);
  assert.equal(A.paese(''), null);
  assert.equal(A.paese(undefined), null);
});

/* ---------------- campagna ---------------- */

test('campagna: legge i parametri UTM', () => {
  const c = A.campagna('?utm_source=instagram&utm_medium=bio&utm_campaign=compendi');
  assert.equal(c.utm_source, 'instagram');
  assert.equal(c.utm_medium, 'bio');
  assert.equal(c.utm_campaign, 'compendi');
});

test('campagna: senza parametri restituisce null, non stringhe vuote', () => {
  const c = A.campagna('');
  assert.equal(c.utm_source, null);
  assert.equal(c.utm_medium, null);
  assert.equal(c.utm_campaign, null);
});

test('campagna: ignora i parametri che non sono UTM', () => {
  const c = A.campagna('?email=mario@esempio.it&token=segreto');
  assert.deepEqual(c, { utm_source: null, utm_medium: null, utm_campaign: null });
});

/* ---------------- Promesse sulla privacy ---------------- */

test('nel file non compare nessun uso di cookie', () => {
  const sorgente = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');
  assert.ok(!/document\.cookie/.test(sorgente), 'analytics.js non deve toccare i cookie');
  assert.ok(!/localStorage/.test(sorgente),
    'nessun deposito permanente: l\'identificativo deve morire con la scheda');
});

test('l\'identificativo di sessione sta in sessionStorage, non altrove', () => {
  const sorgente = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');
  assert.ok(/sessionStorage/.test(sorgente));
});

/* ---------------- larghezzaUtile ---------------- */

test('larghezzaUtile ripiega quando innerWidth vale 0', () => {
  // Caso reale osservato: in una scheda in secondo piano e nei browser
  // incorporati nelle app, innerWidth è 0 e il dato sul dispositivo
  // spariva senza che nessuno se ne accorgesse.
  assert.equal(A.larghezzaUtile({ innerWidth: 1440 }), 1440);
  assert.equal(A.larghezzaUtile({
    innerWidth: 0,
    document: { documentElement: { clientWidth: 390 } }
  }), 390);
  assert.equal(A.larghezzaUtile({
    innerWidth: 0,
    document: { documentElement: { clientWidth: 0 } },
    screen: { width: 1470 }
  }), 1470);
});

test('larghezzaUtile restituisce 0 se non c\'è proprio niente', () => {
  assert.equal(A.larghezzaUtile({}), 0);
  assert.equal(A.larghezzaUtile(undefined), 0);
  assert.equal(A.dispositivo(A.larghezzaUtile({})), null);
});

test('la catena completa classifica un telefono anche a viewport zero', () => {
  const finto = { innerWidth: 0, document: { documentElement: { clientWidth: 0 } }, screen: { width: 390 } };
  assert.equal(A.dispositivo(A.larghezzaUtile(finto)), 'mobile');
});
