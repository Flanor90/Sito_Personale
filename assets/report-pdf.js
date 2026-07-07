/* ============================================================
   report-pdf.js — genera un report PDF scaricabile del test
   ------------------------------------------------------------
   Costruisce un PDF brandizzato (logo, grafica del risultato,
   descrizione del profilo) a partire dai dati strutturati che
   quiz-core.js espone in result.report.
   jsPDF viene caricato in modo lazy solo al primo download, così
   non appesantisce il caricamento iniziale della pagina.
   Nessun dato lascia il dispositivo: il PDF è generato in locale.
   ============================================================ */
(function () {
  'use strict';

  var JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  /* Palette del sito in RGB */
  var C = {
    notte: [27, 42, 58],
    mirtillo: [124, 129, 179],
    mirtillo600: [96, 101, 155],
    mirtillo700: [76, 80, 127],
    mirtillo300: [169, 172, 212],
    mirtillo50: [240, 241, 248],
    crema: [247, 245, 241],
    tortora: [228, 223, 216],
    tortoraDark: [207, 200, 189],
    inchiostro: [43, 43, 43],
    muted: [96, 96, 96],
    white: [255, 255, 255],
    band: [[52, 211, 153], [251, 191, 36], [251, 146, 60], [248, 113, 113]]
  };

  var CONTACT = {
    nome: 'Dott. Alberto Del Bove',
    ruolo: 'Psicologo Psicoterapeuta · Analisi della Domanda',
    email: 'alberto.delbove.psicoterapeuta@gmail.com',
    tel: '+39 345 503 2318',
    sito: 'albertodelbove-psicoterapeuta.it'
  };

  function loadJsPDF() {
    return new Promise(function (resolve, reject) {
      if (window.jspdf && window.jspdf.jsPDF) { return resolve(window.jspdf.jsPDF); }
      var s = document.createElement('script');
      s.src = JSPDF_SRC;
      s.onload = function () {
        if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); }
        else { reject(new Error('jsPDF non disponibile')); }
      };
      s.onerror = function () { reject(new Error('Impossibile caricare il generatore PDF')); };
      document.head.appendChild(s);
    });
  }

  /* Converte l'SVG del logo in PNG per inserirlo nel PDF come immagine. */
  function logoDataUrl() {
    return new Promise(function (resolve) {
      try {
        var svg = document.querySelector('header svg[aria-label^="Logo"]');
        if (!svg) { return resolve(null); }
        var clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        var xml = new XMLSerializer().serializeToString(clone);
        var url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
        var img = new Image();
        img.onload = function () {
          var size = 240;
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          try { resolve(canvas.toDataURL('image/png')); }
          catch (e) { resolve(null); }
        };
        img.onerror = function () { resolve(null); };
        img.src = url;
      } catch (e) { resolve(null); }
    });
  }

  function slugify(s) {
    return String(s || 'test').toLowerCase()
      .replace(/[àáâ]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function todayLabel() {
    var d = new Date();
    var mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return d.getDate() + ' ' + mesi[d.getMonth()] + ' ' + d.getFullYear();
  }

  function build(jsPDF, result, logoPng) {
    var rep = result.report;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var PW = 210, PH = 297, M = 16, CW = PW - M * 2;
    var y = 0;

    function fill(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function txt(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function draw(c) { doc.setDrawColor(c[0], c[1], c[2]); }

    // Salta pagina se non c'è abbastanza spazio verticale.
    function ensure(space) {
      if (y + space > PH - 18) { doc.addPage(); y = M; }
    }

    function paragraph(text, size, color, gap) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      txt(color || C.inchiostro);
      var lines = doc.splitTextToSize(text, CW);
      var lh = size * 0.352778 * 1.35;
      lines.forEach(function (ln) {
        ensure(lh);
        doc.text(ln, M, y, { baseline: 'top' });
        y += lh;
      });
      y += (gap == null ? 2 : gap);
    }

    /* ---------- Header brandizzato ---------- */
    fill(C.notte);
    doc.rect(0, 0, PW, 34, 'F');
    if (logoPng) {
      try { doc.addImage(logoPng, 'PNG', M, 8, 18, 18); } catch (e) { logoPng = null; }
    }
    if (!logoPng) {
      fill(C.mirtillo); doc.roundedRect(M, 8, 18, 18, 3, 3, 'F');
      txt(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('AB', M + 9, 17.5, { align: 'center', baseline: 'middle' });
    }
    txt(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(CONTACT.nome, M + 23, 14, { baseline: 'top' });
    txt(C.mirtillo300); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(CONTACT.ruolo, M + 23, 21, { baseline: 'top' });
    doc.setFontSize(8); txt(C.mirtillo300);
    doc.text('REPORT · ' + todayLabel(), PW - M, 14, { align: 'right', baseline: 'top' });

    y = 44;

    /* ---------- Titolo del test e risultato ---------- */
    txt(C.mirtillo700); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text((rep.intro || rep.testName).toUpperCase(), M, y, { baseline: 'top' });
    y += 7;
    txt(C.notte); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
    doc.splitTextToSize(rep.title, CW).forEach(function (ln) {
      doc.text(ln, M, y, { baseline: 'top' }); y += 9.5;
    });
    y += 1;
    // chip con il codice/punteggio
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    var chip = rep.code;
    var chipW = doc.getTextWidth(chip) + 10;
    fill(C.mirtillo50); doc.roundedRect(M, y, chipW, 8, 4, 4, 'F');
    txt(C.mirtillo700); doc.text(chip, M + 5, y + 4, { baseline: 'middle' });
    y += 15;

    /* ---------- Grafica del risultato ---------- */
    if (rep.kind === 'profilo') { drawAxisBars(rep.bars); }
    else if (rep.kind === 'punteggio') { drawGauge(rep); }
    else if (rep.kind === 'area') { drawAreaBars(rep.areaBars); }

    /* ---------- Descrizione ---------- */
    ensure(10);
    txt(C.notte); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Il tuo profilo, in sintesi', M, y, { baseline: 'top' }); y += 7;
    paragraph(rep.description, 10.5, C.inchiostro, 4);

    /* ---------- Liste (forza, tips, ecc.) ---------- */
    rep.lists.forEach(function (list) {
      ensure(12);
      txt(C.notte); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(list.heading, M, y, { baseline: 'top' }); y += 6.5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      list.items.forEach(function (item) {
        var lines = doc.splitTextToSize(item, CW - 6);
        var lh = 10 * 0.352778 * 1.35;
        ensure(lines.length * lh + 1);
        txt(C.mirtillo600); doc.setFont('helvetica', 'bold');
        doc.text('›', M, y, { baseline: 'top' });
        txt(C.inchiostro); doc.setFont('helvetica', 'normal');
        lines.forEach(function (ln, i) {
          doc.text(ln, M + 6, y, { baseline: 'top' }); y += lh;
        });
        y += 1.5;
      });
      y += 3;
    });

    /* ---------- Disclaimer ---------- */
    ensure(24);
    fill(C.crema); doc.roundedRect(M, y, CW, 20, 3, 3, 'F');
    txt(C.muted); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
    var disc = 'Questo report è uno strumento di auto-osservazione: non è un test diagnostico, ' +
      'standardizzato o clinicamente validato e non sostituisce una valutazione professionale. ' +
      'Offre spunti di riflessione da approfondire, se lo desideri, in un primo colloquio.';
    doc.splitTextToSize(disc, CW - 10).forEach(function (ln, i) {
      doc.text(ln, M + 5, y + 5 + i * 4, { baseline: 'top' });
    });
    y += 26;

    /* ---------- CTA / contatti ---------- */
    ensure(30);
    fill(C.notte); doc.roundedRect(M, y, CW, 26, 3, 3, 'F');
    txt(C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Vuoi dare parole a questo risultato?', M + 6, y + 7, { baseline: 'top' });
    txt(C.mirtillo300); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Prenota un primo colloquio conoscitivo, online o in studio a Itri (LT).', M + 6, y + 13, { baseline: 'top' });
    doc.setFontSize(8.5); txt(C.white);
    doc.text(CONTACT.email + '   ·   ' + CONTACT.tel + '   ·   ' + CONTACT.sito, M + 6, y + 19.5, { baseline: 'top' });
    y += 26;

    /* ---------- Footer su ogni pagina ---------- */
    var pages = doc.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
      doc.setPage(p);
      draw(C.tortoraDark); doc.setLineWidth(0.2);
      doc.line(M, PH - 12, PW - M, PH - 12);
      txt(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text('I dati dei test restano sul tuo dispositivo · ' + CONTACT.sito, M, PH - 8, { baseline: 'top' });
      doc.text('Pagina ' + p + ' di ' + pages, PW - M, PH - 8, { align: 'right', baseline: 'top' });
    }

    return doc;

    /* ===== helper grafici (usano la chiusura su doc/y) ===== */

    function drawAxisBars(bars) {
      bars.forEach(function (b) {
        var tot = (b.leftVal + b.rightVal) || 1;
        var pct = Math.round(b.leftVal / tot * 100);
        ensure(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(C.muted);
        doc.text(b.left + ' ' + pct + '%', M, y, { baseline: 'top' });
        doc.text(b.right + ' ' + (100 - pct) + '%', PW - M, y, { align: 'right', baseline: 'top' });
        y += 5;
        fill(C.tortora); doc.roundedRect(M, y, CW, 3, 1.5, 1.5, 'F');
        fill(C.mirtillo600); doc.roundedRect(M, y, Math.max(CW * pct / 100, 3), 3, 1.5, 1.5, 'F');
        y += 8;
      });
      y += 2;
    }

    function drawGauge(rep) {
      ensure(20);
      var segW = CW / 4;
      for (var i = 0; i < 4; i++) {
        fill(C.band[i]);
        doc.rect(M + i * segW, y, segW, 4, 'F');
      }
      var mx = M + Math.min(Math.max(rep.pct, 0), 100) / 100 * CW;
      fill(C.notte);
      doc.triangle(mx, y - 1, mx - 2.2, y - 4, mx + 2.2, y - 4, 'F');
      y += 9;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); txt(C.notte);
      doc.text('Punteggio ' + rep.score + ' su ' + rep.max + ' — ' + rep.title, M, y, { baseline: 'top' });
      y += 9;
    }

    function drawAreaBars(bars) {
      bars.forEach(function (a) {
        var pct = Math.round(a.value / a.max * 100);
        ensure(11);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(C.muted);
        doc.text(a.name, M, y, { baseline: 'top' });
        doc.text(a.value + '/' + a.max, PW - M, y, { align: 'right', baseline: 'top' });
        y += 5;
        fill(C.tortora); doc.roundedRect(M, y, CW, 3, 1.5, 1.5, 'F');
        fill(a.isTop ? C.mirtillo600 : C.tortoraDark);
        doc.roundedRect(M, y, Math.max(CW * pct / 100, 3), 3, 1.5, 1.5, 'F');
        y += 7.5;
      });
      y += 2;
    }
  }

  function download(result) {
    if (!result || !result.report) {
      return Promise.reject(new Error('Nessun risultato da esportare'));
    }
    return Promise.all([loadJsPDF(), logoDataUrl()]).then(function (arr) {
      var doc = build(arr[0], result, arr[1]);
      var name = 'report-' + slugify(result.report.testName) + '.pdf';
      doc.save(name);
      return name;
    });
  }

  window.QuizReport = { download: download };
})();
