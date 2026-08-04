/* ============================================================
   markdown.js — dal testo che scrivo all'HTML che parte via email
   ------------------------------------------------------------
   Scrivere una newsletter in HTML a mano è un supplizio; scriverla in
   un editor visuale produce HTML che i client di posta rompono. La via
   di mezzo è un markdown ridotto all'osso: titoli, grassetto, corsivo,
   link, elenchi, citazioni, linee.

   Due vincoli guidano il risultato:

   1. **Stili in linea.** I client di posta (Gmail e Outlook in testa)
      buttano via i fogli di stile e spesso anche i tag <style>. L'unica
      cosa che sopravvive ovunque è style="" su ogni singolo elemento.

   2. **Niente HTML dell'utente.** Il testo viene messo in sicurezza
      PRIMA di essere convertito: se scrivo "<b>" nel testo, deve
      comparire scritto "<b>", non interpretato. Così il corpo di una
      newsletter non può mai iniettare markup imprevisto.

   Stile UMD come gli altri file del progetto: funziona in Node (per i
   test automatici) e nel browser (per l'anteprima nel pannello).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AdminMarkdown = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* I colori del brand, ripetuti qui perché finiscono dentro le email. */
  var NOTTE = '#1B2A3A';
  var MIRTILLO = '#4C507F';
  var MIRTILLO_CHIARO = '#7C81B3';
  var TORTORA = '#E4DFD8';

  var STILI = {
    p:  'margin:0 0 15px;',
    h1: 'margin:0 0 14px;font-family:Georgia,\'Times New Roman\',serif;font-size:23px;line-height:1.3;color:' + NOTTE + ';font-weight:normal;',
    h2: 'margin:26px 0 10px;font-family:Georgia,\'Times New Roman\',serif;font-size:19px;line-height:1.35;color:' + NOTTE + ';font-weight:normal;',
    h3: 'margin:22px 0 8px;font-size:16px;line-height:1.4;color:' + NOTTE + ';font-weight:bold;',
    ul: 'margin:0 0 15px;padding-left:22px;',
    ol: 'margin:0 0 15px;padding-left:22px;',
    li: 'margin-bottom:5px;',
    bq: 'margin:0 0 15px;padding:2px 0 2px 16px;border-left:3px solid ' + MIRTILLO_CHIARO + ';color:#5c5c5c;',
    hr: 'border:0;border-top:1px solid ' + TORTORA + ';margin:24px 0;',
    a:  'color:' + MIRTILLO + ';text-decoration:underline;'
  };

  /* ---------- Messa in sicurezza ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Accetta solo indirizzi che non possono eseguire codice.
   * "javascript:qualcosa" travestito da link è il trucco più vecchio del
   * mestiere: qui semplicemente non passa e il link diventa testo.
   */
  function urlSicuro(url) {
    var u = String(url || '').trim();
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(u)) { return u; }
    return null;
  }

  /* ---------- Elementi dentro la riga ---------- */

  // L'ordine conta: prima i link (che contengono parentesi), poi grassetto
  // e corsivo, così un titolo di link con asterischi non si spezza.
  function inline(testo) {
    var s = esc(testo);

    // [testo](indirizzo)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (tutto, etichetta, url) {
      var sicuro = urlSicuro(url);
      if (!sicuro) { return etichetta; }
      return '<a href="' + esc(sicuro) + '" style="' + STILI.a + '">' + etichetta + '</a>';
    });

    // **grassetto** e *corsivo* (e le varianti con _)
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');

    // Una riga spezzata a mano resta spezzata.
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  /* ---------- Blocchi ---------- */

  /**
   * Converte il markdown in HTML pronto per l'email.
   * Il testo viene diviso in blocchi separati da righe vuote: ogni blocco
   * diventa un paragrafo, un titolo, un elenco o una citazione.
   */
  function rendi(md) {
    var testo = String(md == null ? '' : md).replace(/\r\n?/g, '\n').trim();
    if (!testo) { return ''; }

    var blocchi = testo.split(/\n{2,}/);
    var fuori = [];

    blocchi.forEach(function (blocco) {
      var b = blocco.trim();
      if (!b) { return; }

      // Linea orizzontale
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(b)) {
        fuori.push('<hr style="' + STILI.hr + '">');
        return;
      }

      // Titoli
      var titolo = b.match(/^(#{1,3})\s+(.*)$/);
      if (titolo && b.indexOf('\n') === -1) {
        var liv = 'h' + titolo[1].length;
        fuori.push('<' + liv + ' style="' + STILI[liv] + '">' + inline(titolo[2]) + '</' + liv + '>');
        return;
      }

      // Citazione: ogni riga inizia con >
      if (/^>/.test(b)) {
        var citazione = b.split('\n')
          .map(function (r) { return r.replace(/^>\s?/, ''); })
          .join('\n');
        fuori.push('<blockquote style="' + STILI.bq + '">' + inline(citazione) + '</blockquote>');
        return;
      }

      // Elenco puntato
      if (/^[-*+]\s+/.test(b)) {
        fuori.push(elenco(b, 'ul', /^[-*+]\s+/));
        return;
      }

      // Elenco numerato
      if (/^\d+[.)]\s+/.test(b)) {
        fuori.push(elenco(b, 'ol', /^\d+[.)]\s+/));
        return;
      }

      fuori.push('<p style="' + STILI.p + '">' + inline(b) + '</p>');
    });

    return fuori.join('\n');
  }

  /** Righe che iniziano col segno di elenco → <li>; le altre continuano la voce precedente. */
  function elenco(blocco, tag, segno) {
    var voci = [];
    blocco.split('\n').forEach(function (riga) {
      if (segno.test(riga)) {
        voci.push(riga.replace(segno, '').trim());
      } else if (voci.length) {
        voci[voci.length - 1] += '\n' + riga.trim();
      }
    });

    var dentro = voci.map(function (v) {
      return '<li style="' + STILI.li + '">' + inline(v) + '</li>';
    }).join('');

    return '<' + tag + ' style="' + STILI[tag] + '">' + dentro + '</' + tag + '>';
  }

  /**
   * Versione solo testo, per i client di posta che non mostrano l'HTML
   * (e per chi legge con una sintesi vocale). Toglie i segni del markdown
   * ma tiene l'indirizzo dei link, che altrimenti si perderebbero.
   */
  function soloTesto(md) {
    return String(md == null ? '' : md)
      .replace(/\r\n?/g, '\n')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '---')
      .trim();
  }

  /** Quanto ci vuole a leggerla: utile per non spedire mattoni. */
  function minutiDiLettura(md) {
    var parole = soloTesto(md).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(parole / 200));
  }

  return {
    rendi: rendi,
    soloTesto: soloTesto,
    minutiDiLettura: minutiDiLettura,
    urlSicuro: urlSicuro,
    esc: esc
  };
});
