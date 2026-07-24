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
