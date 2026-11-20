/* ============================================================
   prenotazione.js — la pagina /prenotazione/
   ------------------------------------------------------------
   Si arriva qui dal link personale di un'email. Lo stesso indirizzo
   serve alla persona e ad Alberto: è il token a dire chi sta guardando,
   e il server decide che cosa ciascuno può fare.

   Persona   in attesa   → cambia orario, annulla
             proposta    → conferma, scegli un altro orario, annulla
             confermata  → aggiungi al calendario, cambia orario, annulla
   Alberto   in attesa   → conferma, proponi un altro orario, annulla
             proposta    → proponi un orario diverso, annulla
             confermata  → aggiungi al calendario, proponi un altro orario, annulla

   Niente finestre di conferma del browser: «annulla» apre un riquadro
   nella pagina, e la conferma è un secondo pulsante.
   ============================================================ */
(function () {
  'use strict';

  var API = 'https://ynmxgdcikqlgcupfszza.supabase.co/functions/v1/api/booking';
  var WHATSAPP = '393455032318';
  var box = document.getElementById('pren');
  var token = new URLSearchParams(location.search).get('t') || '';
  var dati = null;

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dove(d) { return d.setting === 'studio' ? 'in studio a Itri, via Luigi Pirandello 8' : 'online, in videochiamata'; }

  function chiama(azione, extra) {
    var corpo = { t: token, azione: azione };
    for (var k in (extra || {})) { corpo[k] = extra[k]; }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (r) { return r.json(); });
  }

  /* ---------- Calendario: Google e file .ics ---------- */

  function compatta(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  function linkGoogle(d) {
    var titolo = d.ruolo === 'alberto' ? 'Colloquio conoscitivo: ' + (d.nome || d.email) : 'Colloquio conoscitivo con il Dott. Alberto Del Bove';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(titolo) +
      '&dates=' + compatta(d.slot_start) + '/' + compatta(d.slot_end) +
      '&location=' + encodeURIComponent(d.setting === 'studio' ? 'Via Luigi Pirandello 8, 04020 Itri LT' : (d.meet || 'Online'));
  }

  function linkIcs(d) {
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//albertodelbove-psicologo.it//IT',
      'BEGIN:VEVENT',
      'UID:' + compatta(d.slot_start) + '@albertodelbove-psicologo.it',
      'DTSTAMP:' + compatta(new Date().toISOString()),
      'DTSTART:' + compatta(d.slot_start), 'DTEND:' + compatta(d.slot_end),
      'SUMMARY:Colloquio conoscitivo con il Dott. Alberto Del Bove',
      'LOCATION:' + (d.setting === 'studio' ? 'Via Luigi Pirandello 8\\, 04020 Itri LT' : 'Online'),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }

  /* ---------- Scelta di un orario ---------- */

  var fmtGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });
  var fmtGiornoLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });
  var fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

  function sceltaOrario(slots, testoPulsante, quando) {
    if (!slots.length) {
      return el('<p class="text-sm text-inchiostro/70 mt-4">In questo momento non ci sono orari liberi nel calendario. ' +
        'Scrivimi su <a class="underline text-mirtillo-700" href="https://wa.me/' + WHATSAPP + '">WhatsApp</a> e ne troviamo uno.</p>');
    }
    var giorni = [];
    var perGiorno = {};
    slots.forEach(function (s) {
      var k = fmtGiornoLungo.format(new Date(s));
      if (!perGiorno[k]) { perGiorno[k] = []; giorni.push({ k: k, breve: fmtGiorno.format(new Date(s)) }); }
      perGiorno[k].push(s);
    });
    var w = el(
      '<div class="mt-5 rounded-2xl border border-tortora bg-white p-5">' +
        '<p class="text-sm font-semibold text-notte mb-3">Scegli giorno e ora <span class="font-normal text-inchiostro/55">(ora italiana)</span></p>' +
        '<div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" data-giorni></div>' +
        '<div class="grid grid-cols-4 gap-2 mt-2" data-ore></div>' +
        '<label class="block text-sm font-semibold text-notte mt-5 mb-1.5" for="pren-nota">Due righe <span class="font-normal text-inchiostro/45">(facoltativo)</span></label>' +
        '<textarea id="pren-nota" rows="2" class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '<button type="button" data-invia disabled class="mt-4 w-full inline-flex items-center justify-center gap-2 bg-notte text-white text-base font-semibold px-6 py-4 rounded-full hover:bg-mirtillo-700 transition-colors disabled:opacity-40">' + esc(testoPulsante) + '</button>' +
      '</div>'
    ).firstChild;
    var scelto = null;
    var zonaGiorni = w.querySelector('[data-giorni]');
    var zonaOre = w.querySelector('[data-ore]');
    var invia = w.querySelector('[data-invia]');

    function mostraGiorno(k) {
      Array.prototype.forEach.call(zonaGiorni.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === k)); });
      zonaOre.innerHTML = '';
      perGiorno[k].forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = fmtOra.format(new Date(s));
        b.setAttribute('aria-pressed', String(s === scelto));
        b.className = 'rounded-full border border-tortora-dark px-2 py-2 text-center text-sm text-notte aria-pressed:bg-notte aria-pressed:border-notte aria-pressed:text-white transition-colors';
        b.addEventListener('click', function () {
          scelto = s;
          Array.prototype.forEach.call(zonaOre.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          invia.disabled = false;
          invia.textContent = testoPulsante + ': ' + fmtGiornoLungo.format(new Date(s)) + ', ' + fmtOra.format(new Date(s));
        });
        zonaOre.appendChild(b);
      });
    }
    giorni.forEach(function (g, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-k', g.k);
      b.className = 'flex-none rounded-xl border border-tortora-dark px-3 py-2 text-sm font-semibold text-notte aria-pressed:bg-notte aria-pressed:border-notte aria-pressed:text-white transition-colors';
      b.textContent = g.breve;
      b.addEventListener('click', function () { mostraGiorno(g.k); });
      zonaGiorni.appendChild(b);
      if (i === 0) { setTimeout(function () { mostraGiorno(g.k); }, 0); }
    });
    invia.addEventListener('click', function () {
      if (!scelto) { return; }
      agisci('proponi', { slot: scelto, nota: w.querySelector('#pren-nota').value.trim() }, invia, quando);
    });
    return w;
  }

  /* ---------- Annullamento in due passi ---------- */

  function riquadroAnnulla() {
    var w = el(
      '<div class="mt-5 rounded-2xl border border-tortora bg-white p-5">' +
        '<p class="text-sm text-inchiostro/80 mb-3">Vuoi davvero annullare? Se vuoi, lascia due righe.</p>' +
        '<textarea id="pren-nota-annulla" rows="2" class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '<button type="button" data-si class="mt-4 inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte font-semibold px-6 py-3 rounded-full hover:bg-crema-dark transition-colors">Sì, annulla l\'appuntamento</button>' +
      '</div>'
    ).firstChild;
    var si = w.querySelector('[data-si]');
    si.addEventListener('click', function () {
      agisci('annulla', { nota: w.querySelector('#pren-nota-annulla').value.trim() }, si, 'annullato');
    });
    return w;
  }

  /* ---------- Azioni ---------- */

  var avviso = '';

  function agisci(azione, extra, pulsante, cosa) {
    pulsante.disabled = true;
    chiama(azione, extra).then(function (d) {
      if (!d || !d.ok) {
        if (d && d.errore === 'occupato') { avviso = 'Quell\'orario è stato appena preso. Scegline un altro.'; return carica(); }
        throw new Error(d && d.errore);
      }
      var altro = d.ruolo === 'alberto' ? 'la persona' : 'Alberto';
      avviso = azione === 'presenza'
        ? 'Grazie, ho avvisato Alberto che ci sarai.'
        : azione === 'conferma'
        ? 'Confermato. Vi arriva un\'email con il promemoria.'
        : azione === 'annulla'
          ? 'Appuntamento annullato. Ho avvisato ' + altro + '.'
          : 'Fatto: ho mandato la proposta a ' + altro + '.';
      dati = d;
      disegna();
    }).catch(function () {
      pulsante.disabled = false;
      avviso = 'Qualcosa non ha funzionato. Riprova tra poco, oppure scrivimi su WhatsApp.';
      disegna();
      void cosa;
    });
  }

  /* ---------- La pagina ---------- */

  function bottone(testo, primario) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = testo;
    b.className = primario
      ? 'inline-flex items-center justify-center gap-2 bg-notte text-white text-base font-semibold px-6 py-3.5 rounded-full hover:bg-mirtillo-700 transition-colors'
      : 'inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte text-base font-semibold px-6 py-3.5 rounded-full hover:bg-crema-dark transition-colors';
    return b;
  }

  function disegna() {
    var d = dati;
    var alberto = d.ruolo === 'alberto';
    var titolo, frase;
    if (d.stato === 'annullata') {
      titolo = 'Appuntamento annullato';
      frase = 'Il colloquio di ' + esc(d.quando) + ' è annullato.';
    } else if (d.stato === 'confermata') {
      titolo = 'Il colloquio è confermato';
      frase = (alberto ? 'Con ' + esc(d.nome || d.email) + ', ' : '') + d.quando + ', ' + dove(d) + '.';
    } else if (d.stato === 'proposta') {
      titolo = alberto ? 'In attesa di risposta' : 'Ti propongo un altro orario';
      frase = alberto
        ? 'Hai proposto ' + esc(d.quando) + ', ' + dove(d) + '. Ti arriva un\'email quando la persona risponde.'
        : 'Ti propongo ' + esc(d.quando) + ', ' + dove(d) + '. Se ti va bene confermalo, altrimenti scegline un altro.';
    } else {
      titolo = alberto ? 'Nuova richiesta di colloquio' : 'Richiesta inviata';
      frase = alberto
        ? esc(d.nome || d.email) + ' chiede ' + esc(d.quando) + ', ' + dove(d) + '.'
        : 'Hai chiesto un colloquio conoscitivo per ' + esc(d.quando) + ', ' + dove(d) + '. Te lo confermo io a breve: ti arriva un\'email.';
    }

    box.innerHTML =
      (avviso ? '<p class="mb-6 rounded-xl bg-mirtillo-100 text-mirtillo-700 px-4 py-3 text-sm">' + esc(avviso) + '</p>' : '') +
      '<h1 class="font-serif text-3xl sm:text-4xl leading-[1.15] text-notte mb-4">' + esc(titolo) + '</h1>' +
      '<p class="text-lg leading-relaxed text-inchiostro/80 mb-5">' + frase + '</p>' +
      (d.nota && d.stato !== 'annullata' ? '<p class="mb-5 rounded-xl bg-crema px-4 py-3 text-[0.97rem] text-inchiostro/80 border-l-2 border-mirtillo-600">«' + esc(d.nota) + '»</p>' : '') +
      (alberto ? '<div class="rounded-2xl border border-tortora bg-white p-5 mb-5 text-[0.97rem] leading-relaxed">' +
        '<p><span class="text-inchiostro/55">Email</span> <a class="font-semibold text-mirtillo-700 underline" href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></p>' +
        (d.telefono ? '<p><span class="text-inchiostro/55">Telefono</span> <a class="font-semibold text-mirtillo-700 underline" href="tel:' + esc(d.telefono) + '">' + esc(d.telefono) + '</a></p>' : '') +
        (d.messaggio ? '<p class="mt-3 whitespace-pre-wrap text-inchiostro/80">' + esc(d.messaggio) + '</p>' : '') +
      '</div>' : '') +
      '<div class="flex flex-wrap gap-3" data-azioni></div>' +
      '<div data-sotto></div>';
    avviso = '';

    var azioni = box.querySelector('[data-azioni]');
    var sotto = box.querySelector('[data-sotto]');
    function apri(nodo) { sotto.innerHTML = ''; sotto.appendChild(nodo); nodo.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

    if (d.stato === 'annullata') {
      var nuovo = document.createElement('a');
      nuovo.href = '/#contatti';
      nuovo.textContent = 'Prenota un nuovo colloquio';
      nuovo.className = 'inline-flex items-center gap-2 bg-notte text-white px-6 py-3.5 rounded-full font-semibold hover:bg-mirtillo-700 transition-colors';
      azioni.appendChild(nuovo);
      if (!alberto) { box.appendChild(riquadroMessaggio()); }
      return;
    }

    // La persona, a colloquio confermato, può dire «ci sarò» (facoltativo).
    if (!alberto && d.stato === 'confermata') {
      if (d.presenza) {
        var gia = document.createElement('p');
        gia.className = 'w-full text-[0.97rem] text-mirtillo-700 font-semibold';
        gia.textContent = 'Hai confermato che ci sarai. Grazie.';
        azioni.appendChild(gia);
      } else {
        var ciSaro = bottone('Confermo che ci sarò', true);
        ciSaro.addEventListener('click', function () { agisci('presenza', {}, ciSaro, 'presenza'); });
        azioni.appendChild(ciSaro);
      }
    }
    if (alberto && d.stato === 'confermata' && d.presenza) {
      var ok = document.createElement('p');
      ok.className = 'w-full text-[0.97rem] text-mirtillo-700 font-semibold';
      ok.textContent = 'La persona ha confermato che ci sarà.';
      azioni.appendChild(ok);
    }

    var puoConfermare = (alberto && d.stato === 'in_attesa') || (!alberto && d.stato === 'proposta');
    if (puoConfermare) {
      var conferma = bottone(alberto ? 'Conferma questo orario' : 'Va bene, confermo', true);
      conferma.addEventListener('click', function () { agisci('conferma', {}, conferma, 'confermato'); });
      azioni.appendChild(conferma);
    }
    if (d.stato === 'confermata' && d.meet && d.setting === 'online') {
      var meet = document.createElement('a');
      meet.href = d.meet; meet.target = '_blank'; meet.rel = 'noopener';
      meet.textContent = 'Entra nella videochiamata';
      meet.className = 'inline-flex items-center gap-2 bg-mirtillo-700 text-white px-6 py-3.5 rounded-full font-semibold hover:bg-mirtillo-600 transition-colors';
      azioni.appendChild(meet);
    }
    if (d.stato === 'confermata') {
      var g = document.createElement('a');
      g.href = linkGoogle(d); g.target = '_blank'; g.rel = 'noopener';
      g.textContent = 'Aggiungi a Google Calendar';
      g.className = 'inline-flex items-center gap-2 bg-notte text-white px-6 py-3.5 rounded-full font-semibold hover:bg-mirtillo-700 transition-colors';
      azioni.appendChild(g);
      if (!alberto) {
        var i = document.createElement('a');
        i.href = linkIcs(d); i.download = 'colloquio.ics';
        i.textContent = 'Altro calendario (.ics)';
        i.className = 'inline-flex items-center gap-2 border border-tortora-dark text-notte px-6 py-3.5 rounded-full font-semibold hover:bg-crema-dark transition-colors';
        azioni.appendChild(i);
      }
    }
    var testoCambia = alberto
      ? (d.stato === 'proposta' ? 'Proponi un orario diverso' : 'Proponi un altro orario')
      : (d.stato === 'proposta' ? 'Scegli un altro orario' : 'Cambia orario');
    var cambia = bottone(testoCambia, false);
    cambia.addEventListener('click', function () {
      apri(sceltaOrario(d.slots || [], alberto ? 'Proponi' : 'Scegli', 'proposto'));
    });
    azioni.appendChild(cambia);

    var annulla = bottone(alberto ? 'Annulla la richiesta' : 'Annulla', false);
    annulla.addEventListener('click', function () { apri(riquadroAnnulla()); });
    azioni.appendChild(annulla);
    if (!alberto) { box.appendChild(riquadroMessaggio()); }
  }

  /* Due righe per Alberto, in qualunque momento: arrivano per email e
     restano fra le richieste del pannello. */
  function riquadroMessaggio() {
    var w = el(
      '<div class="mt-8 rounded-2xl border border-tortora bg-white p-5">' +
        '<label for="pren-msg" class="block text-sm font-semibold text-notte mb-1.5">Vuoi dirmi qualcosa prima del colloquio?</label>' +
        '<p class="text-sm text-inchiostro/65 mb-3">Anche solo due righe: cosa ti porta, cosa ti aspetti, una domanda. Lo leggo io e ti rispondo.</p>' +
        '<textarea id="pren-msg" rows="3" class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '<button type="button" data-invia-msg class="mt-3 inline-flex items-center justify-center gap-2 bg-notte text-white font-semibold px-6 py-3 rounded-full hover:bg-mirtillo-700 transition-colors">Invia il messaggio</button>' +
        '<p class="mt-3 text-sm text-inchiostro/60">Preferisci WhatsApp? <a class="underline text-mirtillo-700" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">Scrivimi lì</a>.</p>' +
      '</div>'
    ).firstChild;
    var b = w.querySelector('[data-invia-msg]');
    b.addEventListener('click', function () {
      var testo = w.querySelector('#pren-msg').value.trim();
      if (!testo) { w.querySelector('#pren-msg').focus(); return; }
      b.disabled = true;
      chiama('messaggio', { testo: testo }).then(function (d) {
        if (!d || !d.ok) { throw new Error('ko'); }
        avviso = 'Messaggio inviato: lo leggo io e ti rispondo.';
        dati = d;
        disegna();
      }).catch(function () { b.disabled = false; });
    });
    return w;
  }

  function carica() {
    if (!token) {
      box.innerHTML = '<h1 class="font-serif text-3xl text-notte mb-4">Link incompleto</h1>' +
        '<p class="text-lg text-inchiostro/75">Apri il link direttamente dall\'email che hai ricevuto.</p>';
      return;
    }
    chiama('stato').then(function (d) {
      if (!d || !d.ok) { throw new Error('non trovata'); }
      dati = d;
      disegna();
    }).catch(function () {
      box.innerHTML = '<h1 class="font-serif text-3xl text-notte mb-4">Appuntamento non trovato</h1>' +
        '<p class="text-lg text-inchiostro/75 mb-6">Il link potrebbe essere incompleto. Se ti serve aiuto, scrivimi su ' +
        '<a class="underline text-mirtillo-700" href="https://wa.me/' + WHATSAPP + '">WhatsApp</a>.</p>';
    });
  }

  carica();
})();
