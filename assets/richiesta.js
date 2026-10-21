/* ============================================================
   richiesta.js — il modulo breve delle pagine di destinazione
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Chi arriva da un annuncio su «psicologo online» o «psicologo Itri»
   atterra su una pagina dedicata, non sulla home. Prima, per scrivermi,
   doveva tornare alla home e scorrerla fino al modulo: sedici schermate
   di telefono. Qui il modulo sta nella pagina stessa, in alto.

   Lo stesso server del modulo della home (la richiesta viene salvata e
   mi arriva un avviso), con lo stesso ripiego: se il server non
   risponde si apre il programma di posta col messaggio già pronto, così
   nessuna richiesta va persa in silenzio.

   USO
   Nella pagina, un contenitore con i dati del contesto:

     <div data-richiesta data-setting="Online" data-tema="Vivo all'estero">
       …link di ripiego per chi non ha JavaScript…
     </div>

   e nei metadati "script": ["richiesta.js"]. Lo script sostituisce il
   contenuto del contenitore con il modulo.

   Su telefono aggiunge anche un pulsante in basso che riporta al modulo
   quando è uscito dallo schermo.
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = 'https://ynmxgdcikqlgcupfszza.supabase.co/functions/v1/api/collect';
  var EMAIL = 'alberto.delbove.psicoterapeuta@gmail.com';
  var WHATSAPP = '393455032318';

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function campo(id, etichetta, tipo, extra) {
    return (
      '<div>' +
        '<label for="' + id + '" class="block text-sm font-semibold text-notte mb-1.5">' + etichetta + '</label>' +
        '<input id="' + id + '" type="' + tipo + '" ' + extra +
          ' class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte placeholder:text-inchiostro/40 focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors">' +
      '</div>'
    );
  }

  function modulo(n) {
    return (
      '<form novalidate class="space-y-4" data-modulo-richiesta>' +
        campo('rq-nome-' + n, 'Nome <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'text',
              'name="nome" autocomplete="name" required placeholder="Come ti chiami"') +
        campo('rq-email-' + n, 'Email <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'email',
              'name="email" autocomplete="email" required inputmode="email" placeholder="nome@esempio.it"') +
        campo('rq-tel-' + n, 'Telefono <span class="font-normal text-inchiostro/45">(facoltativo)</span>', 'tel',
              'name="telefono" autocomplete="tel" inputmode="tel" placeholder="+39 …"') +
        '<div>' +
          '<label for="rq-msg-' + n + '" class="block text-sm font-semibold text-notte mb-1.5">Due righe su cosa ti porta qui <span class="font-normal text-inchiostro/45">(facoltativo)</span></label>' +
          '<textarea id="rq-msg-' + n + '" name="messaggio" rows="3" placeholder="Non serve trovare le parole giuste."' +
            ' class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte placeholder:text-inchiostro/40 focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '</div>' +
        '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">' +
        '<p data-esito class="hidden rounded-xl px-4 py-3 text-sm" role="status" aria-live="polite"></p>' +
        '<button type="submit" class="w-full inline-flex items-center justify-center gap-2 bg-notte text-white text-base font-semibold px-6 py-4 rounded-full hover:bg-mirtillo-700 transition-colors">' +
          'Prenota il primo colloquio' +
        '</button>' +
        '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Buongiorno Dott. Del Bove, vorrei prenotare il primo colloquio gratuito.') + '"' +
          ' target="_blank" rel="noopener" data-evento="cta_click" data-evento-etichetta="wa-destinazione"' +
          ' class="w-full inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte text-base font-semibold px-6 py-3.5 rounded-full hover:bg-crema-dark transition-colors">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i> Oppure su WhatsApp' +
        '</a>' +
        '<p class="text-xs leading-relaxed text-inchiostro/55">Ti rispondo io, di solito entro 24–48 ore. I dati servono solo a ricontattarti e restano coperti dal segreto professionale. <a href="/privacy/" class="underline underline-offset-2 hover:text-notte">Informativa</a></p>' +
      '</form>'
    );
  }

  function esito(form, testo, errore) {
    var p = form.querySelector('[data-esito]');
    p.textContent = testo;
    p.classList.remove('hidden', 'bg-red-50', 'text-red-800', 'bg-mirtillo-100', 'text-mirtillo-700');
    p.classList.add(errore ? 'bg-red-50' : 'bg-mirtillo-100', errore ? 'text-red-800' : 'text-mirtillo-700');
  }

  function corpo(dati) {
    var righe = [
      'Richiesta di primo colloquio dal sito (' + location.pathname + ')',
      '',
      'Nome: ' + dati.nome,
      'Email: ' + dati.email
    ];
    if (dati.telefono) { righe.push('Telefono: ' + dati.telefono); }
    if (dati.setting) { righe.push('Preferenza: ' + dati.setting); }
    if (dati.messaggio) { righe.push('', dati.messaggio); }
    return righe.join('\n');
  }

  function collega(contenitore, n) {
    var setting = contenitore.getAttribute('data-setting') || '';
    var tema = contenitore.getAttribute('data-tema') || '';
    contenitore.innerHTML = modulo(n);
    var form = contenitore.querySelector('form');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.hp.value) { return; }   // trappola per i bot
      var dati = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        telefono: form.telefono.value.trim(),
        messaggio: form.messaggio.value.trim(),
        setting: setting
      };
      if (!dati.nome) {
        esito(form, 'Scrivi il tuo nome: mi serve per sapere come rivolgermi a te.', true);
        form.nome.focus();
        return;
      }
      if (!emailValida(dati.email)) {
        esito(form, 'Controlla l\'indirizzo email: sembra incompleto.', true);
        form.email.focus();
        return;
      }

      var invia = form.querySelector('button[type="submit"]');
      invia.disabled = true;
      invia.classList.add('opacity-70', 'cursor-wait');

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dati.email,
          name: dati.nome,
          phone: dati.telefono,
          kind: 'contatto',
          source: 'contatto',
          lang: 'it',
          consent: false,
          setting: setting,
          topics: tema ? [tema] : [],
          message: dati.messaggio,
          page: location.pathname,
          referrer: document.referrer,
          hp: ''
        })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http')); })
        .then(function (r) {
          if (!r || !r.ok) { throw new Error('rifiutata'); }
          esito(form, 'Ho ricevuto la tua richiesta, grazie. Ti rispondo io personalmente, di solito entro due giorni lavorativi.', false);
          form.reset();
          if (window.SiteAnalytics) {
            window.SiteAnalytics.evento('contatto_inviato', { fonte: 'destinazione', pagina: location.pathname });
          }
        })
        .catch(function () {
          // Server irraggiungibile: apro la posta col messaggio già pronto.
          window.location.href = 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent('Richiesta primo colloquio — ' + dati.nome) +
            '&body=' + encodeURIComponent(corpo(dati));
          esito(form, 'Si sta aprendo il tuo programma di posta con il messaggio già pronto. Se non succede nulla, scrivimi a ' + EMAIL + ' oppure su WhatsApp.', false);
        })
        .then(function () {
          invia.disabled = false;
          invia.classList.remove('opacity-70', 'cursor-wait');
        });
    });

    return form;
  }

  /* Pulsante in basso, solo su telefono: compare quando il modulo è
     uscito dallo schermo e ci riporta. Sparisce mentre il banner dei
     cookie occupa lo stesso angolo (regola in tailwind.input.css). */
  function pulsanteRitorno(bersaglio) {
    if (!('IntersectionObserver' in window)) { return; }
    var barra = document.createElement('div');
    barra.id = 'richiesta-ritorno';
    barra.className = 'lg:hidden fixed inset-x-0 bottom-0 z-40 p-3 transition-transform duration-300 translate-y-full';
    barra.innerHTML =
      '<a href="#richiesta" class="flex items-center justify-center w-full bg-lume text-notte font-semibold px-6 py-4 rounded-full">' +
        'Primo colloquio gratuito, 45 minuti' +
      '</a>';
    document.body.appendChild(barra);
    document.body.classList.add('con-ritorno');
    var osservatore = new IntersectionObserver(function (voci) {
      var visibile = voci[0].isIntersecting;
      barra.classList.toggle('translate-y-full', visibile);
    }, { rootMargin: '0px 0px -10% 0px' });
    osservatore.observe(bersaglio);
  }

  function avvia() {
    var contenitori = document.querySelectorAll('[data-richiesta]');
    if (!contenitori.length) { return; }
    Array.prototype.forEach.call(contenitori, function (c, i) { collega(c, i); });
    if (window.lucide) { window.lucide.createIcons(); }
    var primo = document.getElementById('richiesta') || contenitori[0];
    pulsanteRitorno(primo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
