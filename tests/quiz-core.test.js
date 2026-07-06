/* ============================================================
   Test automatici per assets/quiz-core.js
   Eseguibili senza dipendenze esterne:  node --test
   ============================================================ */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const QuizCore = require('../assets/quiz-core.js');

/* Piccola utility: crea un array di N risposte tutte allo stesso indice. */
function pick(n, index) {
  return Array.from({ length: n }, () => index);
}

test('espone l\'API pubblica attesa', () => {
  ['LIKERT', 'jungProfiles', 'axisBar', 'TESTS', 'isValidEmail', 'scoreAnswers', 'evaluate', 'buildEmailBody']
    .forEach((k) => assert.ok(k in QuizCore, `manca ${k}`));
  assert.deepEqual(Object.keys(QuizCore.TESTS).sort(), ['burnout', 'domanda', 'junghiano']);
});

/* ---------------- Test junghiano ---------------- */

test('junghiano: tutte le prime opzioni → profilo EST (Pragmatico Dinamico)', () => {
  const t = QuizCore.TESTS.junghiano;
  const { scores, result } = QuizCore.evaluate('junghiano', pick(t.questions.length, 0));
  assert.equal(scores.E, 3);
  assert.equal(scores.S, 3);
  assert.equal(scores.T, 3);
  assert.equal(result.code, 'PROFILO EST');
  assert.equal(result.title, 'Il Pragmatico Dinamico');
  assert.match(result.html, /I tuoi assi junghiani/);
});

test('junghiano: tutte le seconde opzioni → profilo INF (Riflessivo Empatico)', () => {
  const t = QuizCore.TESTS.junghiano;
  const { result } = QuizCore.evaluate('junghiano', pick(t.questions.length, 1));
  assert.equal(result.code, 'PROFILO INF');
  assert.equal(result.title, 'Il Riflessivo Empatico');
});

test('junghiano: ogni profilo di jungProfiles ha titolo, forza e attenzione', () => {
  Object.entries(QuizCore.jungProfiles).forEach(([code, p]) => {
    assert.ok(p.title, `${code} senza titolo`);
    assert.ok(Array.isArray(p.forza) && p.forza.length, `${code} senza punti di forza`);
    assert.ok(Array.isArray(p.attenzione) && p.attenzione.length, `${code} senza aree di crescita`);
  });
});

/* ---------------- Test burnout ---------------- */

test('burnout: punteggio minimo (0/24) → Energie in equilibrio', () => {
  const t = QuizCore.TESTS.burnout;
  const { scores, result } = QuizCore.evaluate('burnout', pick(t.questions.length, 0));
  assert.equal(scores.P, 0);
  assert.equal(result.code, 'PUNTEGGIO 0 / 24');
  assert.equal(result.title, 'Energie in equilibrio');
});

test('burnout: punteggio massimo (24/24) → Carico critico', () => {
  const t = QuizCore.TESTS.burnout;
  const { scores, result } = QuizCore.evaluate('burnout', pick(t.questions.length, 3));
  assert.equal(scores.P, 24);
  assert.equal(result.title, 'Carico critico');
});

test('burnout: i confini delle fasce cadono nella banda corretta', () => {
  const cases = [
    { index: 1, tot: 8, band: 'Primi segnali di logorio' },  // 8 * 1
    { index: 2, tot: 16, band: 'Zona di allerta' }            // 8 * 2
  ];
  const n = QuizCore.TESTS.burnout.questions.length;
  cases.forEach(({ index, tot, band }) => {
    const { scores, result } = QuizCore.evaluate('burnout', pick(n, index));
    assert.equal(scores.P, tot);
    assert.equal(result.title, band);
  });
});

/* ---------------- Test "domanda" ---------------- */

test('domanda: converge sull\'area dominante', () => {
  const n = QuizCore.TESTS.domanda.questions.length;
  const map = [
    { index: 0, area: 'Legami e relazioni' },
    { index: 1, area: 'Lavoro e realizzazione' },
    { index: 2, area: 'Identità e rapporto con te stesso' },
    { index: 3, area: 'Direzione e cambiamento' }
  ];
  map.forEach(({ index, area }) => {
    const { result } = QuizCore.evaluate('domanda', pick(n, index));
    assert.equal(result.title, area);
  });
});

/* ---------------- Robustezza dello scoring ---------------- */

test('scoreAnswers lancia un errore su test o risposta non validi', () => {
  assert.throws(() => QuizCore.scoreAnswers('inesistente', [0]), /Test sconosciuto/);
  assert.throws(() => QuizCore.scoreAnswers('junghiano', [9]), /Risposta non valida/);
});

test('ogni test produce un risultato valido per qualunque colonna di risposte', () => {
  Object.keys(QuizCore.TESTS).forEach((id) => {
    const t = QuizCore.TESTS[id];
    const maxOpts = Math.max(...t.questions.map((q) => q.options.length));
    for (let opt = 0; opt < maxOpts; opt++) {
      const answers = t.questions.map((q) => Math.min(opt, q.options.length - 1));
      const { result } = QuizCore.evaluate(id, answers);
      assert.ok(result.title, `${id} col ${opt}: titolo mancante`);
      assert.ok(result.html.length > 20, `${id} col ${opt}: html troppo corto`);
      assert.ok(result.share, `${id} col ${opt}: testo di condivisione mancante`);
    }
  });
});

/* ---------------- Dati per il report PDF ---------------- */

test('ogni risultato espone i dati strutturati per il report PDF', () => {
  Object.keys(QuizCore.TESTS).forEach((id) => {
    const t = QuizCore.TESTS[id];
    const answers = t.questions.map(() => 0);
    const { result } = QuizCore.evaluate(id, answers);
    const rep = result.report;
    assert.ok(rep, `${id}: report mancante`);
    assert.ok(rep.testName && rep.title && rep.code, `${id}: intestazione report incompleta`);
    assert.ok(rep.description && rep.description.length > 20, `${id}: descrizione report troppo corta`);
    assert.ok(Array.isArray(rep.lists) && rep.lists.length, `${id}: liste report mancanti`);
    rep.lists.forEach((l) => {
      assert.ok(l.heading, `${id}: lista senza titolo`);
      assert.ok(Array.isArray(l.items) && l.items.length, `${id}: lista senza voci`);
    });
    // Ogni tipo di report deve avere il proprio elemento grafico.
    if (rep.kind === 'profilo') assert.ok(rep.bars.length === 3);
    if (rep.kind === 'punteggio') assert.equal(typeof rep.gauge, 'number');
    if (rep.kind === 'area') assert.ok(rep.areaBars.length === 4);
  });
});

/* ---------------- Email ---------------- */

test('isValidEmail accetta indirizzi validi e rifiuta quelli errati', () => {
  ['a@b.it', 'nome.cognome@example.com', ' spazi@dominio.org '].forEach((e) =>
    assert.equal(QuizCore.isValidEmail(e), true, `dovrebbe accettare ${e}`));
  ['', 'senza-chiocciola', 'a@b', 'a@@b.it', 'a b@c.it', null, undefined].forEach((e) =>
    assert.equal(QuizCore.isValidEmail(e), false, `dovrebbe rifiutare ${e}`));
});

test('buildEmailBody include sempre nome, email e setting', () => {
  const body = QuizCore.buildEmailBody({ nome: 'Mario Rossi', email: 'mario@rossi.it', setting: 'Online' });
  assert.match(body, /Nome: Mario Rossi/);
  assert.match(body, /Email: mario@rossi\.it/);
  assert.match(body, /Preferenza setting: Online/);
  assert.doesNotMatch(body, /Telefono:/);
  assert.doesNotMatch(body, /Temi indicati:/);
});

test('buildEmailBody aggiunge telefono, temi e messaggio solo se presenti', () => {
  const body = QuizCore.buildEmailBody({
    nome: 'Lucia', email: 'lucia@x.it', telefono: '+39 333',
    setting: 'In studio', temi: ['Ansia', 'Burnout'], messaggio: 'Vorrei un colloquio.'
  });
  assert.match(body, /Telefono: \+39 333/);
  assert.match(body, /Temi indicati: Ansia, Burnout/);
  assert.match(body, /Vorrei un colloquio\./);
});

test('buildEmailBody è robusto con input vuoto', () => {
  const body = QuizCore.buildEmailBody();
  assert.match(body, /Richiesta di primo colloquio dal sito/);
  assert.match(body, /Nome: \n/);
});
