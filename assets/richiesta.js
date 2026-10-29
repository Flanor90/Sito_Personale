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

  /* Nelle pagine tematiche (coppia, ansia…) non si sa ancora se la
     persona cerca l'online o lo studio: glielo chiedo con tre scelte,
     «Non so ancora» compresa, così nessuno resta fuori. */
  var SCELTE_SETTING = ['Online', 'In studio a Itri (LT)', 'Non so ancora'];

  function sceltaSetting(n) {
    return (
      '<fieldset>' +
        '<legend class="block text-sm font-semibold text-notte mb-2">Come preferisci incontrarci?</legend>' +
        '<div class="flex flex-wrap gap-2">' +
          SCELTE_SETTING.map(function (v, i) {
            return '<label class="cursor-pointer">' +
              '<input type="radio" name="setting" value="' + v + '" class="peer sr-only"' + (i === 2 ? ' checked' : '') + '>' +
              '<span class="inline-block rounded-full border border-tortora-dark px-4 py-2 text-sm text-notte peer-checked:bg-notte peer-checked:border-notte peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-mirtillo-600 transition-colors">' +
                (v === 'In studio a Itri (LT)' ? 'In studio a Itri' : v) +
              '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</fieldset>'
    );
  }

  /* ----------------------------------------------------------------
     Proposta di orari per il colloquio online
     Non è una prenotazione: chi scrive propone fino a tre orari e io li
     confermo o ne propongo un altro. Le fasce sono quelle in cui lavoro,
     dal lunedì al venerdì alle 9, 10, 11, 12, 14, 15, 16 e 17 (alle 13 c'è
     la pausa), sui prossimi dieci giorni lavorativi, festivi esclusi.
     Gli orari sono in ora italiana; chi è in un altro fuso vede accanto
     anche la sua. Le proposte viaggiano dentro il testo del messaggio,
     così il server non cambia.
     ---------------------------------------------------------------- */
  var ORE = [9, 10, 11, 12, 14, 15, 16, 17];
  var GIORNI_AVANTI = 10;
  var MAX_PROPOSTE = 3;
  var NOMI_GIORNO = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var NOMI_MESE = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
    'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  /* Quanto Roma è avanti rispetto a UTC in un dato istante (ora legale
     compresa), ricavato dal browser invece che scritto a mano. */
  function scartoRoma(ms) {
    var parti = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date(ms));
    function v(t) { return Number(parti.filter(function (p) { return p.type === t; })[0].value); }
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute')) - ms;
  }
  function istanteRoma(a, m, g, ora) {
    var stima = Date.UTC(a, m, g, ora);
    return stima - scartoRoma(stima);
  }

  function pasquetta(a) {
    // Calcolo gregoriano della Pasqua, poi il giorno dopo.
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4,
        g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3),
        i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4,
        x = (32 + 2 * f + 2 * k - i - l) % 7, y = Math.floor((b + 11 * i + 22 * x) / 451),
        mese = Math.floor((i + x - 7 * y + 114) / 31), giorno = ((i + x - 7 * y + 114) % 31) + 1;
    var p = new Date(Date.UTC(a, mese - 1, giorno + 1));
    return p.getUTCMonth() + '-' + p.getUTCDate();
  }
  var FESTIVI = ['0-1', '0-6', '3-25', '4-1', '5-2', '7-15', '10-1', '11-8', '11-25', '11-26'];

  function prossimiGiorni() {
    var oggi = new Date(Date.now() + scartoRoma(Date.now()));
    var giorno = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate()));
    var giorni = [];
    while (giorni.length < GIORNI_AVANTI) {
      giorno = new Date(giorno.getTime() + 864e5);
      var dow = giorno.getUTCDay();
      var chiave = giorno.getUTCMonth() + '-' + giorno.getUTCDate();
      if (dow === 0 || dow === 6) { continue; }
      if (FESTIVI.indexOf(chiave) !== -1 || chiave === pasquetta(giorno.getUTCFullYear())) { continue; }
      giorni.push({ a: giorno.getUTCFullYear(), m: giorno.getUTCMonth(), g: giorno.getUTCDate(), dow: dow });
    }
    return giorni;
  }

  var FUSO_LOCALE = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  })();
  function oraLocale(ms) {
    if (!FUSO_LOCALE || FUSO_LOCALE === 'Europe/Rome') { return ''; }
    var locale = new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    var roma = new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    return locale === roma ? '' : locale;
  }

  function etichettaGiorno(d) {
    return NOMI_GIORNO[d.dow] + ' ' + d.g + ' ' + NOMI_MESE[d.m];
  }

  function sceltaOrari(n) {
    var giorni = prossimiGiorni();
    return (
      '<fieldset data-orari class="min-w-0">' +
        '<legend class="block text-sm font-semibold text-notte mb-1">Quando ti farebbe comodo? <span class="font-normal text-inchiostro/45">(facoltativo)</span></legend>' +
        '<p class="text-xs leading-relaxed text-inchiostro/60 mb-3">Proponi fino a tre orari per il colloquio online, in ora italiana' +
          (oraLocale(Date.now()) ? ', con accanto l\'ora da te' : '') +
          '. Te ne confermo uno, o ne cerchiamo un altro insieme.</p>' +
        '<div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="group" aria-label="Giorno">' +
          giorni.map(function (d, i) {
            return '<button type="button" data-giorno="' + i + '" aria-pressed="' + (i === 0) + '"' +
              ' class="flex-none rounded-xl border border-tortora-dark px-3 py-2 text-left text-sm leading-tight text-notte aria-pressed:bg-notte aria-pressed:border-notte aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mirtillo-600 transition-colors">' +
              '<span class="block text-xs opacity-70">' + NOMI_GIORNO[d.dow].slice(0, 3) + '</span>' +
              '<span class="block font-semibold">' + d.g + ' ' + NOMI_MESE[d.m].slice(0, 3) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        giorni.map(function (d, i) {
          // Classe e non attributo hidden: la classe grid vincerebbe sull'attributo.
          return '<div data-ore-del-giorno="' + i + '" class="grid-cols-4 gap-2 mt-2 ' + (i === 0 ? 'grid' : 'hidden') + '">' +
            ORE.map(function (ora) {
              var ms = istanteRoma(d.a, d.m, d.g, ora);
              var testo = etichettaGiorno(d) + ', ' + ora + ':00';
              var locale = oraLocale(ms);
              var id = 'rq-ora-' + n + '-' + i + '-' + ora;
              return '<label for="' + id + '" class="cursor-pointer">' +
                '<input id="' + id + '" type="checkbox" name="orario" value="' + testo + (locale ? ' (da te ' + locale + ')' : '') + '" class="peer sr-only">' +
                '<span class="block rounded-full border border-tortora-dark px-2 py-2 text-center text-sm text-notte peer-checked:bg-notte peer-checked:border-notte peer-checked:text-white peer-disabled:opacity-35 peer-focus-visible:ring-2 peer-focus-visible:ring-mirtillo-600 transition-colors">' +
                  ora + ':00' + (locale ? '<span class="block text-[0.7rem] opacity-70">da te ' + locale + '</span>' : '') +
                '</span>' +
              '</label>';
            }).join('') +
          '</div>';
        }).join('') +
        '<p data-proposte class="mt-3 text-sm text-inchiostro/75" aria-live="polite"></p>' +
      '</fieldset>'
    );
  }

  function attivaOrari(form) {
    var box = form.querySelector('[data-orari]');
    if (!box) { return; }
    var giorni = box.querySelectorAll('[data-giorno]');
    var riepilogo = box.querySelector('[data-proposte]');
    Array.prototype.forEach.call(giorni, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(giorni, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        Array.prototype.forEach.call(box.querySelectorAll('[data-ore-del-giorno]'), function (o) {
          var scelto = o.getAttribute('data-ore-del-giorno') === b.getAttribute('data-giorno');
          o.classList.toggle('grid', scelto);
          o.classList.toggle('hidden', !scelto);
        });
      });
    });
    box.addEventListener('change', function () {
      var scelti = proposte(form);
      Array.prototype.forEach.call(box.querySelectorAll('input[name="orario"]'), function (c) {
        c.disabled = !c.checked && scelti.length >= MAX_PROPOSTE;
      });
      riepilogo.textContent = scelti.length
        ? 'Proponi: ' + scelti.join('; ') + (scelti.length >= MAX_PROPOSTE ? '. Ne hai scelti tre, il massimo.' : '.')
        : '';
    });
    // Gli orari valgono per l'online: se si sceglie lo studio, spariscono.
    Array.prototype.forEach.call(form.querySelectorAll('input[name="setting"]'), function (r) {
      r.addEventListener('change', function () {
        box.hidden = form.querySelector('input[name="setting"]:checked').value === 'In studio a Itri (LT)';
      });
    });
  }

  function proposte(form) {
    var box = form.querySelector('[data-orari]');
    if (!box || box.hidden) { return []; }
    return Array.prototype.map.call(box.querySelectorAll('input[name="orario"]:checked'), function (c) { return c.value; });
  }

  /* Il messaggio WhatsApp già scritto cambia con la pagina: chi arriva
     dalla pagina sull'ansia non deve trovare le parole da solo, e io so
     da dove arriva chi mi scrive. */
  var PAGINA_DEL_TEMA = {
    'Ansia / Attacchi di panico': "sull'ansia e gli attacchi di panico",
    'Percorso di coppia': 'sulla terapia di coppia',
    'Depressione': 'sulla depressione',
    'Stress lavorativo / Burnout': 'sul burnout',
    'ADHD adulto': "sull'ADHD negli adulti",
    "Vivo all'estero": "per chi vive all'estero"
  };

  function messaggioWhatsApp(tema, setting) {
    var base = 'Buongiorno Dott. Del Bove, ';
    if (PAGINA_DEL_TEMA[tema]) {
      return base + 'ho letto la pagina ' + PAGINA_DEL_TEMA[tema] + ' e vorrei capire se posso iniziare un percorso.';
    }
    if (setting === 'In studio a Itri (LT)') {
      return base + 'vorrei prenotare un colloquio conoscitivo nello studio di Itri.';
    }
    return base + 'vorrei prenotare un colloquio conoscitivo.';
  }

  function linkWhatsApp(tema, setting) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(messaggioWhatsApp(tema, setting));
  }

  function modulo(n, chiediSetting, tema, setting) {
    return (
      '<form novalidate class="space-y-4" data-modulo-richiesta>' +
        (chiediSetting ? sceltaSetting(n) : '') +
        (setting === 'In studio a Itri (LT)' ? '' : sceltaOrari(n)) +
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
          'Prenota il colloquio conoscitivo' +
        '</button>' +
        '<a href="' + linkWhatsApp(tema, setting) + '"' +
          ' target="_blank" rel="noopener" data-evento="cta_click" data-evento-etichetta="wa-destinazione"' +
          ' class="w-full inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte text-base font-semibold px-6 py-3.5 rounded-full hover:bg-crema-dark transition-colors">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i> Oppure su WhatsApp' +
        '</a>' +
        // Chi sta per scrivere a uno psicoterapeuta per la prima volta si
        // chiede soprattutto che cosa succederà dopo: lo dico in tre righe.
        '<div class="rounded-xl bg-crema/70 px-4 py-3">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-mirtillo-700 mb-2">Cosa succede dopo</p>' +
          '<ol class="space-y-1.5 text-sm leading-relaxed text-inchiostro/75 list-decimal pl-4">' +
            '<li>Ti rispondo io, di solito entro poche ore, per confermare l\'orario che hai proposto o sceglierne un altro.</li>' +
            '<li>Ci incontriamo per 45 minuti, online o in studio, per capire che cosa ti porta.</li>' +
            '<li>Decidi tu se e come continuare, senza impegno; se ti serve altro, te lo dico.</li>' +
          '</ol>' +
        '</div>' +
        '<p class="text-xs leading-relaxed text-inchiostro/55">I dati servono solo a ricontattarti e restano coperti dal segreto professionale. <a href="/privacy/" class="underline underline-offset-2 hover:text-notte">Informativa</a></p>' +
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
    if (dati.orari.length) { righe.push('', testoOrari(dati.orari)); }
    if (dati.messaggio) { righe.push('', dati.messaggio); }
    return righe.join('\n');
  }

  function testoOrari(orari) {
    return 'Orari proposti per il colloquio online (ora italiana):\n- ' + orari.join('\n- ');
  }

  function collega(contenitore, n) {
    var settingFisso = contenitore.getAttribute('data-setting') || '';
    var tema = contenitore.getAttribute('data-tema') || '';
    contenitore.innerHTML = modulo(n, !settingFisso, tema, settingFisso);
    var form = contenitore.querySelector('form');
    attivaOrari(form);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.hp.value) { return; }   // trappola per i bot
      var scelto = form.querySelector('input[name="setting"]:checked');
      var setting = settingFisso || (scelto ? scelto.value : '');
      var dati = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        telefono: form.telefono.value.trim(),
        messaggio: form.messaggio.value.trim(),
        setting: setting,
        orari: proposte(form)
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
          message: [dati.orari.length ? testoOrari(dati.orari) : '', dati.messaggio].filter(Boolean).join('\n\n'),
          page: location.pathname,
          referrer: document.referrer,
          hp: ''
        })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http')); })
        .then(function (r) {
          if (!r || !r.ok) { throw new Error('rifiutata'); }
          esito(form, dati.orari.length
            ? 'Ho ricevuto la tua proposta, grazie. Ti confermo io l\'orario, o te ne propongo un altro, di solito entro poche ore.'
            : 'Ho ricevuto la tua richiesta, grazie. Ti rispondo io personalmente, di solito entro poche ore.', false);
          form.reset();
          var orari = form.querySelector('[data-orari]');
          if (orari) { orari.dispatchEvent(new Event('change')); }
          if (window.SiteAnalytics) {
            window.SiteAnalytics.evento('contatto_inviato', { fonte: 'destinazione', pagina: location.pathname, orari: dati.orari.length });
          }
          if (window.ConsensoCookie) { window.ConsensoCookie.conversioneModulo(); }
        })
        .catch(function () {
          // Server irraggiungibile: apro la posta col messaggio già pronto.
          window.location.href = 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent('Richiesta primo colloquio, ' + dati.nome) +
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

  /* Pulsanti in basso: compaiono quando il modulo è uscito dallo schermo
     e ci riportano, con accanto WhatsApp, che per molti è il modo più
     facile di fare il primo passo. Su telefono occupano la larghezza, su
     computer stanno in un angolo. Spariscono mentre il banner dei cookie
     occupa lo stesso spazio (regola in tailwind.input.css). */
  function pulsanteRitorno(bersaglio, tema, setting) {
    if (!('IntersectionObserver' in window)) { return; }
    var barra = document.createElement('div');
    barra.id = 'richiesta-ritorno';
    barra.className = 'fixed inset-x-0 bottom-0 z-40 p-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:p-0 transition-transform duration-300 translate-y-[150%]';
    barra.innerHTML =
      '<div class="flex gap-2 lg:shadow-xl lg:rounded-full">' +
        '<a href="' + linkWhatsApp(tema, setting) + '" target="_blank" rel="noopener" data-evento="cta_click" data-evento-etichetta="wa-barra"' +
          ' class="flex-none inline-flex items-center justify-center gap-2 bg-white text-notte border border-tortora-dark font-semibold px-5 py-4 rounded-full" aria-label="Scrivimi su WhatsApp">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i><span class="hidden sm:inline">WhatsApp</span>' +
        '</a>' +
        '<a href="#richiesta" data-evento="cta_click" data-evento-etichetta="barra-colloquio" class="flex-1 flex items-center justify-center bg-lume text-notte font-semibold px-6 py-4 rounded-full">' +
          'Colloquio conoscitivo, 45 minuti' +
        '</a>' +
      '</div>';
    document.body.appendChild(barra);
    document.body.classList.add('con-ritorno');
    // Nelle pagine di lettura il modulo sta in fondo: la barra aspetta che
    // la persona abbia cominciato a leggere, invece di comparire subito.
    var moduloInVista = false;
    function aggiorna() {
      var mostra = !moduloInVista && window.scrollY > window.innerHeight * 0.6;
      barra.classList.toggle('translate-y-[150%]', !mostra);
    }
    var osservatore = new IntersectionObserver(function (voci) {
      moduloInVista = voci[0].isIntersecting;
      aggiorna();
    }, { rootMargin: '0px 0px -10% 0px' });
    osservatore.observe(bersaglio);
    window.addEventListener('scroll', aggiorna, { passive: true });
  }

  /* Il pulsante «Primo colloquio» dell'intestazione porta al modulo della
     home. Su una pagina che ha già il suo modulo, porta lì: chi è arrivato
     sulla pagina dell'ansia non deve ricominciare dalla home. */
  function intestazioneVersoModulo() {
    var sel = '#site-header a[href="/#contatti"], #mobile-menu a[href="/#contatti"]';
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (a) {
      a.setAttribute('href', '#richiesta');
    });
  }

  function avvia() {
    var contenitori = document.querySelectorAll('[data-richiesta]');
    if (!contenitori.length) { return; }
    Array.prototype.forEach.call(contenitori, function (c, i) { collega(c, i); });
    var primo = document.getElementById('richiesta') || contenitori[0];
    var fonte = primo.querySelector('[data-richiesta]') || contenitori[0];
    pulsanteRitorno(primo, fonte.getAttribute('data-tema') || '', fonte.getAttribute('data-setting') || '');
    if (document.getElementById('richiesta')) { intestazioneVersoModulo(); }
    if (window.lucide) { window.lucide.createIcons(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
