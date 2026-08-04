/* ============================================================
   Test automatici per assets/newsletter.js
   Verifica le funzioni pure (senza DOM):  node --test
   ============================================================ */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Newsletter = require('../assets/newsletter.js');

test('espone l\'API pubblica attesa', () => {
  ['CONFIG', 'isValidEmail', 'resolveEndpoint', 'buildPayload', 'subscribe', 'attachForm']
    .forEach((k) => assert.ok(k in Newsletter, `manca ${k}`));
});

/* ---------------- isValidEmail ---------------- */

test('isValidEmail accetta indirizzi validi e rifiuta quelli malformati', () => {
  ['a@b.it', 'nome.cognome@esempio.com', 'x@y.co'].forEach((e) =>
    assert.ok(Newsletter.isValidEmail(e), `dovrebbe accettare ${e}`));
  ['', '  ', 'a@b', 'senza-chiocciola.it', 'a b@c.it', null, undefined].forEach((e) =>
    assert.ok(!Newsletter.isValidEmail(e), `dovrebbe rifiutare ${JSON.stringify(e)}`));
});

/* ---------------- resolveEndpoint ---------------- */

test('resolveEndpoint usa l\'endpoint della fonte quando presente', () => {
  const cfg = { endpoints: { default: 'D', test: 'T', compendi: '' } };
  assert.equal(Newsletter.resolveEndpoint('test', cfg), 'T');
});

test('resolveEndpoint ripiega su default quando la fonte manca o è vuota', () => {
  const cfg = { endpoints: { default: 'D', compendi: '' } };
  assert.equal(Newsletter.resolveEndpoint('newsletter', cfg), 'D'); // fonte assente
  assert.equal(Newsletter.resolveEndpoint('compendi', cfg), 'D');   // fonte vuota
  assert.equal(Newsletter.resolveEndpoint(undefined, cfg), 'D');    // nessuna fonte
});

test('resolveEndpoint restituisce stringa vuota se non c\'è nessun endpoint', () => {
  assert.equal(Newsletter.resolveEndpoint('test', { endpoints: {} }), '');
});

test('resolveEndpoint: una fonte granulare ricade sulla sua famiglia, poi su default', () => {
  const conFamiglia = { endpoints: { default: 'D', test: 'T' } };
  assert.equal(Newsletter.resolveEndpoint('test-adhd', conFamiglia), 'T');

  const soloDefault = { endpoints: { default: 'D' } };
  assert.equal(Newsletter.resolveEndpoint('test-adhd', soloDefault), 'D');

  // L'endpoint esatto, se c'è, ha comunque la precedenza sulla famiglia.
  const conEsatto = { endpoints: { default: 'D', test: 'T', 'test-adhd': 'A' } };
  assert.equal(Newsletter.resolveEndpoint('test-adhd', conEsatto), 'A');
});

/* ---------------- buildPayload ---------------- */

test('buildPayload include email, fonte e campi tecnici; trimma i valori', () => {
  const cfg = { fields: { email: 'EMAIL', name: 'NOME', source: 'FONTE' } };
  const p = Newsletter.buildPayload({ email: '  a@b.it ', source: 'test', lang: 'en' }, cfg);
  assert.equal(p.EMAIL, 'a@b.it');
  assert.equal(p.FONTE, 'test');
  assert.equal(p.email_address_check, ''); // honeypot vuoto
  assert.equal(p.locale, 'en');
  assert.equal(p.html_type, 'simple');
});

test('buildPayload omette NOME quando il nome è assente', () => {
  const cfg = { fields: { email: 'EMAIL', name: 'NOME', source: 'FONTE' } };
  const p = Newsletter.buildPayload({ email: 'a@b.it', source: 'newsletter' }, cfg);
  assert.ok(!('NOME' in p), 'NOME non dovrebbe comparire senza nome');
});

test('buildPayload include NOME quando fornito e omette FONTE se vuota', () => {
  const cfg = { fields: { email: 'EMAIL', name: 'NOME', source: 'FONTE' } };
  const p = Newsletter.buildPayload({ email: 'a@b.it', name: ' Anna ', source: '' }, cfg);
  assert.equal(p.NOME, 'Anna');
  assert.ok(!('FONTE' in p), 'FONTE non dovrebbe comparire se vuota');
});

test('buildPayload usa locale it di default', () => {
  const p = Newsletter.buildPayload({ email: 'a@b.it' }, { fields: { email: 'EMAIL' } });
  assert.equal(p.locale, 'it');
});

/* ============================================================
   Archivio proprio (aggiunto il 04/08/2026)
   ------------------------------------------------------------
   Da questa data ogni email va sia a Brevo sia al database del
   pannello. Qui verifico che il secondo invio sia costruito bene:
   se la "famiglia" della fonte sbaglia, una richiesta di colloquio
   finirebbe archiviata come semplice iscrizione e non genererebbe
   né la scheda Trello né l'avviso per email.
   ============================================================ */

test('kindDaFonte raggruppa le fonti granulari nella loro famiglia', () => {
  assert.equal(Newsletter.kindDaFonte('test-adhd'), 'test');
  assert.equal(Newsletter.kindDaFonte('test-burnout'), 'test');
  assert.equal(Newsletter.kindDaFonte('test'), 'test');
  assert.equal(Newsletter.kindDaFonte('compendi'), 'compendi');
  assert.equal(Newsletter.kindDaFonte('contatto'), 'contatto');
  assert.equal(Newsletter.kindDaFonte('newsletter'), 'newsletter');
});

test('kindDaFonte ripiega su newsletter per fonti sconosciute o assenti', () => {
  assert.equal(Newsletter.kindDaFonte('qualcosa-di-nuovo'), 'newsletter');
  assert.equal(Newsletter.kindDaFonte(''), 'newsletter');
  assert.equal(Newsletter.kindDaFonte(undefined), 'newsletter');
});

test('buildBackendPayload conserva la fonte granulare accanto alla famiglia', () => {
  const p = Newsletter.buildBackendPayload({ email: ' Mario@Esempio.IT ', source: 'test-adhd' });
  assert.equal(p.source, 'test-adhd', 'la fonte precisa serve per segmentare');
  assert.equal(p.kind, 'test', 'la famiglia serve al pannello');
});

test('buildBackendPayload trimma l\'email e tiene vuoto l\'honeypot', () => {
  const p = Newsletter.buildBackendPayload({ email: '  a@b.it  ', name: '  Mario  ' });
  assert.equal(p.email, 'a@b.it');
  assert.equal(p.name, 'Mario');
  assert.equal(p.hp, '', 'l\'honeypot deve partire vuoto: lo riempiono solo i bot');
});

test('buildBackendPayload considera dato il consenso salvo negazione esplicita', () => {
  assert.equal(Newsletter.buildBackendPayload({ email: 'a@b.it' }).consent, true);
  assert.equal(Newsletter.buildBackendPayload({ email: 'a@b.it', consent: false }).consent, false);
});

test('buildBackendPayload non fa uscire nulla oltre ai campi previsti', () => {
  // Se un domani qualcuno passasse per sbaglio le risposte di un test,
  // non devono comunque lasciare il browser.
  const p = Newsletter.buildBackendPayload({
    email: 'a@b.it', risposte: [1, 2, 3], punteggio: 27
  });
  assert.deepEqual(Object.keys(p).sort(),
    ['consent', 'email', 'hp', 'kind', 'lang', 'name', 'page', 'referrer', 'source']);
});
