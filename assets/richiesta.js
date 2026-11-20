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

  /* ----------------------------------------------------------------
     Lingua: quella della pagina (<html lang>). Nelle pagine in inglese
     e spagnolo modulo, calendario e messaggi parlano la lingua di chi
     legge; il modulo per i colleghi resta in italiano.
     ---------------------------------------------------------------- */
  var LINGUA = (function () {
    var l = (document.documentElement.getAttribute('lang') || 'it').slice(0, 2);
    return l === 'en' || l === 'es' ? l : 'it';
  })();
  var LOCALE = { it: 'it-IT', en: 'en-GB', es: 'es-ES' }[LINGUA];
  var TESTI = {
    it: {
      comeIncontrarci: 'Come preferisci incontrarci?', online: 'Online', studio: 'In studio a Itri', nonSo: 'Non so ancora',
      scegli: 'Scegli giorno e ora del colloquio', facoltativo: '(facoltativo)',
      orariInfo: 'Orari liberi in ora italiana', orariLocale: ', con accanto l\'ora da te',
      orariConferma: '. Te lo confermo io per email, o te ne propongo uno vicino.',
      carico: 'Carico gli orari liberi…', nessuno: 'In questo momento non ci sono orari liberi: lascia pure la richiesta, ti propongo io un orario.',
      erroreOrari: 'Non riesco a caricare gli orari: lascia pure la richiesta, ti propongo io un orario.',
      daTe: 'da te', haiScelto: 'Hai scelto: ', giorno: 'Giorno',
      nome: 'Nome', nomePh: 'Come ti chiami', email: 'Email', emailPh: 'nome@esempio.it', tel: 'Telefono',
      msg: 'Un messaggio per me', msgNota: '(facoltativo, ma mi aiuta)',
      msgPh: 'Anche solo due righe: cosa ti porta, cosa ti aspetti, una domanda. Non serve trovare le parole giuste, lo leggo io.',
      invia: 'Prenota il colloquio conoscitivo', wa: 'Oppure su WhatsApp', dopo: 'Cosa succede dopo',
      passi: ['Ti rispondo io, di solito entro poche ore, per confermare l\'orario che hai proposto o sceglierne un altro.',
        'Ci incontriamo per 45 minuti, online o in studio, per capire che cosa ti porta.',
        'Decidi tu se e come continuare, senza impegno; se ti serve altro, te lo dico.'],
      privacy: 'I dati servono solo a ricontattarti e restano coperti dal segreto professionale.', informativa: 'Informativa',
      erroreNome: 'Scrivi il tuo nome: mi serve per sapere come rivolgermi a te.',
      erroreEmail: 'Controlla l\'indirizzo email: sembra incompleto.',
      gia: ['Ho ricevuto il tuo messaggio, grazie: ti rispondo io. Hai già un colloquio conoscitivo per ', ': ti ho rimandato per email il link per spostarlo o annullarlo.'],
      okOrario: ['Ho ricevuto la tua richiesta per ', ', grazie. Te lo confermo io per email, di solito entro poche ore.'],
      ok: 'Ho ricevuto la tua richiesta, grazie. Ti rispondo io personalmente, di solito entro poche ore.',
      posta: 'Si sta aprendo il tuo programma di posta con il messaggio già pronto. Se non succede nulla, scrivimi a ',
      postaWa: ' oppure su WhatsApp.', orarioScelto: 'Orario scelto per il colloquio (ora italiana): ',
      barra: 'Colloquio conoscitivo, 45 minuti', ariaWa: 'Scrivimi su WhatsApp'
    },
    en: {
      comeIncontrarci: 'How would you prefer to meet?', online: 'Online', studio: 'In person in Itri', nonSo: 'Not sure yet',
      scegli: 'Choose a day and time for the session', facoltativo: '(optional)',
      orariInfo: 'Free times in Italian time', orariLocale: ', with your local time next to them',
      orariConferma: '. I will confirm it by email, or suggest one close to it.',
      carico: 'Loading free times…', nessuno: 'There are no free times right now: send your request anyway and I will suggest a time.',
      erroreOrari: 'I cannot load the free times: send your request anyway and I will suggest a time.',
      daTe: 'your time', haiScelto: 'You chose: ', giorno: 'Day',
      nome: 'Name', nomePh: 'Your name', email: 'Email', emailPh: 'name@example.com', tel: 'Phone',
      msg: 'A message for me', msgNota: '(optional, but it helps)',
      msgPh: 'Even just a couple of lines: what brings you, what you hope for, a question. You do not need the right words, I read it myself.',
      invia: 'Book the introductory session', wa: 'Or on WhatsApp', dopo: 'What happens next',
      passi: ['I reply myself, usually within a few hours, to confirm the time you chose or find another one.',
        'We meet for 45 minutes, online or in person, to understand what brings you.',
        'You decide whether and how to continue, with no commitment; if you need something else, I will tell you.'],
      privacy: 'Your details are used only to get back to you and are covered by professional confidentiality.', informativa: 'Privacy notice',
      erroreNome: 'Please write your name, so I know how to address you.',
      erroreEmail: 'Please check your email address: it looks incomplete.',
      gia: ['I have received your message, thank you: I will reply myself. You already have an introductory session on ', ': I have emailed you the link to move or cancel it again.'],
      okOrario: ['I have received your request for ', ', thank you. I will confirm it by email, usually within a few hours.'],
      ok: 'I have received your request, thank you. I will reply personally, usually within a few hours.',
      posta: 'Your email program is opening with the message ready. If nothing happens, write to me at ',
      postaWa: ' or on WhatsApp.', orarioScelto: 'Chosen time for the session (Italian time): ',
      barra: 'Introductory session, 45 minutes', ariaWa: 'Write to me on WhatsApp'
    },
    es: {
      comeIncontrarci: '¿Cómo prefieres que nos veamos?', online: 'Online', studio: 'En la consulta de Itri', nonSo: 'Aún no lo sé',
      scegli: 'Elige día y hora de la sesión', facoltativo: '(opcional)',
      orariInfo: 'Horarios libres en hora de Italia', orariLocale: ', con tu hora al lado',
      orariConferma: '. Te lo confirmo yo por email, o te propongo uno cercano.',
      carico: 'Cargando los horarios libres…', nessuno: 'Ahora mismo no hay horarios libres: envía tu solicitud igualmente y te propongo yo un horario.',
      erroreOrari: 'No consigo cargar los horarios: envía tu solicitud igualmente y te propongo yo un horario.',
      daTe: 'tu hora', haiScelto: 'Has elegido: ', giorno: 'Día',
      nome: 'Nombre', nomePh: 'Cómo te llamas', email: 'Email', emailPh: 'nombre@ejemplo.com', tel: 'Teléfono',
      msg: 'Un mensaje para mí', msgNota: '(opcional, pero me ayuda)',
      msgPh: 'Aunque sean dos líneas: qué te trae, qué esperas, una pregunta. No hace falta encontrar las palabras justas, lo leo yo.',
      invia: 'Reserva la sesión de conocimiento', wa: 'O por WhatsApp', dopo: 'Qué pasa después',
      passi: ['Te respondo yo, normalmente en pocas horas, para confirmar el horario que elegiste o buscar otro.',
        'Nos vemos 45 minutos, online o en la consulta, para entender qué te trae.',
        'Decides tú si continuar y cómo, sin compromiso; si necesitas otra cosa, te lo digo.'],
      privacy: 'Tus datos sirven solo para responderte y están protegidos por el secreto profesional.', informativa: 'Privacidad',
      erroreNome: 'Escribe tu nombre: lo necesito para saber cómo dirigirme a ti.',
      erroreEmail: 'Revisa tu email: parece incompleto.',
      gia: ['He recibido tu mensaje, gracias: te respondo yo. Ya tienes una sesión de conocimiento el ', ': te he vuelto a mandar por email el enlace para cambiarla o anularla.'],
      okOrario: ['He recibido tu solicitud para el ', ', gracias. Te la confirmo yo por email, normalmente en pocas horas.'],
      ok: 'He recibido tu solicitud, gracias. Te respondo yo personalmente, normalmente en pocas horas.',
      posta: 'Se está abriendo tu programa de correo con el mensaje listo. Si no pasa nada, escríbeme a ',
      postaWa: ' o por WhatsApp.', orarioScelto: 'Horario elegido para la sesión (hora de Italia): ',
      barra: 'Sesión de conocimiento, 45 minutos', ariaWa: 'Escríbeme por WhatsApp'
    }
  };
  var T = TESTI[LINGUA];

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
        '<legend class="block text-sm font-semibold text-notte mb-2">' + T.comeIncontrarci + '</legend>' +
        '<div class="flex flex-wrap gap-2">' +
          SCELTE_SETTING.map(function (v, i) {
            return '<label class="cursor-pointer">' +
              '<input type="radio" name="setting" value="' + v + '" class="peer sr-only"' + (i === 2 ? ' checked' : '') + '>' +
              '<span class="inline-block rounded-full border border-tortora-dark px-4 py-2 text-sm text-notte peer-checked:bg-notte peer-checked:border-notte peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-mirtillo-600 transition-colors">' +
                (v === 'In studio a Itri (LT)' ? T.studio : v === 'Non so ancora' ? T.nonSo : T.online) +
              '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</fieldset>'
    );
  }

  /* ----------------------------------------------------------------
     Scelta dell'orario dal calendario
     Gli orari liberi arrivano dal server (orari di lavoro, appuntamenti
     già presi, impegni del calendario di Alberto). La persona ne sceglie
     uno; la richiesta diventa una prenotazione in attesa, che Alberto
     conferma o sposta, e la persona riceve un'email con il link per
     gestirla. Online e studio hanno orari diversi: cambiando modalità la
     lista si ricarica. Gli orari sono in ora italiana; chi è in un altro
     fuso vede accanto anche la sua.
     ---------------------------------------------------------------- */
  var SLOTS = 'https://ynmxgdcikqlgcupfszza.supabase.co/functions/v1/api/slots';

  var FUSO_LOCALE = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  })();
  function oraLocale(ms) {
    if (!FUSO_LOCALE || FUSO_LOCALE === 'Europe/Rome') { return ''; }
    var locale = new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
    var roma = new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    return locale === roma ? '' : locale;
  }
  var fmtGiorno = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });
  var fmtGiornoLungo = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });
  var fmtOra = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

  function sceltaOrari(n, settingFisso) {
    return (
      '<fieldset data-orari data-n="' + n + '"' + (settingFisso ? ' data-setting="' + settingFisso + '"' : '') + ' class="min-w-0">' +
        '<legend class="block text-sm font-semibold text-notte mb-1">' + T.scegli + ' <span class="font-normal text-inchiostro/45">' + T.facoltativo + '</span></legend>' +
        '<p class="text-xs leading-relaxed text-inchiostro/60 mb-3">' + T.orariInfo +
          (oraLocale(Date.now()) ? T.orariLocale : '') + T.orariConferma + '</p>' +
        '<div data-cal><p class="text-sm text-inchiostro/55">' + T.carico + '</p></div>' +
        '<p data-proposte class="mt-3 text-sm text-inchiostro/75" aria-live="polite"></p>' +
      '</fieldset>'
    );
  }

  function disegnaCalendario(box, slots) {
    var cal = box.querySelector('[data-cal]');
    var n = box.getAttribute('data-n');
    if (!slots.length) {
      cal.innerHTML = '<p class="text-sm text-inchiostro/60">' + T.nessuno + '</p>';
      return;
    }
    var giorni = [];
    var perGiorno = {};
    slots.forEach(function (s) {
      var k = fmtGiornoLungo.format(new Date(s));
      if (!perGiorno[k]) { perGiorno[k] = []; giorni.push(k); }
      perGiorno[k].push(s);
    });
    cal.innerHTML =
      '<div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="group" aria-label="' + T.giorno + '">' +
        giorni.map(function (k, i) {
          return '<button type="button" data-giorno="' + i + '" aria-pressed="' + (i === 0) + '"' +
            ' class="flex-none rounded-xl border border-tortora-dark px-3 py-2 text-left text-sm leading-tight text-notte aria-pressed:bg-notte aria-pressed:border-notte aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mirtillo-600 transition-colors">' +
            fmtGiorno.format(new Date(perGiorno[k][0])) +
          '</button>';
        }).join('') +
      '</div>' +
      giorni.map(function (k, i) {
        // Classe e non attributo hidden: la classe grid vincerebbe sull'attributo.
        return '<div data-ore-del-giorno="' + i + '" class="grid-cols-4 gap-2 mt-2 ' + (i === 0 ? 'grid' : 'hidden') + '">' +
          perGiorno[k].map(function (s, j) {
            var locale = oraLocale(Date.parse(s));
            var testo = k + ', ' + fmtOra.format(new Date(s)) + (locale ? ' (' + T.daTe + ' ' + locale + ')' : '');
            var id = 'rq-ora-' + n + '-' + i + '-' + j;
            return '<label for="' + id + '" class="cursor-pointer">' +
              '<input id="' + id + '" type="radio" name="slot" value="' + s + '" data-testo="' + testo + '" class="peer sr-only">' +
              '<span class="block rounded-full border border-tortora-dark px-2 py-2 text-center text-sm text-notte peer-checked:bg-notte peer-checked:border-notte peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-mirtillo-600 transition-colors">' +
                fmtOra.format(new Date(s)) + (locale ? '<span class="block text-[0.7rem] opacity-70">' + T.daTe + ' ' + locale + '</span>' : '') +
              '</span>' +
            '</label>';
          }).join('') +
        '</div>';
      }).join('');
    Array.prototype.forEach.call(cal.querySelectorAll('[data-giorno]'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(cal.querySelectorAll('[data-giorno]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        Array.prototype.forEach.call(cal.querySelectorAll('[data-ore-del-giorno]'), function (o) {
          var scelto = o.getAttribute('data-ore-del-giorno') === b.getAttribute('data-giorno');
          o.classList.toggle('grid', scelto);
          o.classList.toggle('hidden', !scelto);
        });
      });
    });
  }

  function attivaOrari(form) {
    var box = form.querySelector('[data-orari]');
    if (!box) { return; }
    var riepilogo = box.querySelector('[data-proposte]');
    function carica() {
      // Nelle pagine con la modalità già decisa (lo studio di Itri) non c'è
      // scelta nel modulo: vale quella scritta sul contenitore.
      var modo = /itri/i.test(box.getAttribute('data-setting') || settingScelto(form)) ? 'studio' : 'online';
      riepilogo.textContent = '';
      box.querySelector('[data-cal]').innerHTML = '<p class="text-sm text-inchiostro/55">' + T.carico + '</p>';
      fetch(SLOTS + '?setting=' + modo)
        .then(function (r) { return r.json(); })
        .then(function (d) { disegnaCalendario(box, (d && d.slots) || []); })
        .catch(function () {
          box.querySelector('[data-cal]').innerHTML = '<p class="text-sm text-inchiostro/60">' + T.erroreOrari + '</p>';
        });
    }
    box.addEventListener('change', function () {
      var scelti = proposte(form);
      riepilogo.textContent = scelti.length ? T.haiScelto + scelti[0] + '.' : '';
    });
    // Online e studio hanno orari diversi. La modalità è un gruppo di
    // pulsanti nel modulo breve e un menu a tendina in quello della home.
    Array.prototype.forEach.call(form.querySelectorAll('[name="setting"]'), function (r) {
      r.addEventListener('change', carica);
    });
    carica();
  }

  function settingScelto(form) {
    var radio = form.querySelector('input[name="setting"]:checked');
    if (radio) { return radio.value; }
    var menu = form.querySelector('select[name="setting"]');
    return menu ? menu.value : '';
  }

  function slotScelto(form) {
    var c = form.querySelector('input[name="slot"]:checked');
    return c ? c.value : '';
  }

  function proposte(form) {
    var c = form.querySelector('input[name="slot"]:checked');
    return c ? [c.getAttribute('data-testo')] : [];
  }

  /* La home ha un suo modulo, più lungo: carica questo file solo per
     riusare la proposta di orari, con le stesse regole e lo stesso testo. */
  window.ProposteOrari = {
    html: sceltaOrari,
    attiva: attivaOrari,
    proposte: proposte,
    slot: slotScelto,
    testo: function (orari) { return testoOrari(orari); }
  };

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

  /* Chi scrive sceglie già la modalità cancellando quella che non vuole,
     e la prima risposta non deve chiederla. Nella pagina dello studio la
     scelta è già fatta. */
  var PREFERENZA = ' Preferirei: online / in studio a Itri';

  function messaggioWhatsApp(tema, setting) {
    if (LINGUA === 'en') { return 'Hello Dr. Del Bove, I would like to book an introductory session. I would prefer: online / in person in Itri'; }
    if (LINGUA === 'es') { return 'Hola, Dr. Del Bove: me gustaría reservar una sesión de conocimiento. Preferiría: online / en la consulta de Itri'; }
    var base = 'Buongiorno Dott. Del Bove, ';
    if (setting === 'In studio a Itri (LT)') {
      return base + 'vorrei prenotare un colloquio conoscitivo nello studio di Itri.';
    }
    if (PAGINA_DEL_TEMA[tema]) {
      return base + 'ho letto la pagina ' + PAGINA_DEL_TEMA[tema] + ' e vorrei capire se posso iniziare un percorso.' + PREFERENZA;
    }
    return base + 'vorrei prenotare un colloquio conoscitivo.' + PREFERENZA;
  }

  function linkWhatsApp(tema, setting) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(messaggioWhatsApp(tema, setting));
  }

  /* ----------------------------------------------------------------
     Variante per i colleghi (data-variante="colleghi"), sulla pagina
     della supervisione: niente orari del colloquio, la scelta del tipo di
     supervisione, e un avviso a non scrivere dati che rendano
     riconoscibili i pazienti.
     ---------------------------------------------------------------- */
  var TIPI_SUPERVISIONE = ['Un caso', 'Percorso individuale', 'Équipe o servizio'];
  var WA_COLLEGHI = 'Buongiorno Dott. Del Bove, sono un collega e vorrei informazioni sulla supervisione clinica.';

  function moduloColleghi(n) {
    return (
      '<form novalidate class="space-y-4" data-modulo-richiesta>' +
        '<fieldset>' +
          '<legend class="block text-sm font-semibold text-notte mb-2">Di che cosa si tratta?</legend>' +
          '<div class="flex flex-wrap gap-2">' +
            TIPI_SUPERVISIONE.map(function (v, i) {
              return '<label class="cursor-pointer">' +
                '<input type="radio" name="tipo" value="' + v + '" class="peer sr-only"' + (i === 0 ? ' checked' : '') + '>' +
                '<span class="inline-block rounded-full border border-tortora-dark px-4 py-2 text-sm text-notte peer-checked:bg-notte peer-checked:border-notte peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-mirtillo-600 transition-colors">' + v + '</span>' +
              '</label>';
            }).join('') +
          '</div>' +
        '</fieldset>' +
        sceltaSetting(n) +
        campo('rq-nome-' + n, 'Nome e cognome <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'text',
              'name="nome" autocomplete="name" required placeholder="Come ti chiami"') +
        campo('rq-email-' + n, 'Email <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'email',
              'name="email" autocomplete="email" required inputmode="email" placeholder="nome@esempio.it"') +
        campo('rq-tel-' + n, 'Telefono <span class="font-normal text-inchiostro/45">(facoltativo)</span>', 'tel',
              'name="telefono" autocomplete="tel" inputmode="tel" placeholder="+39 …"') +
        '<div>' +
          '<label for="rq-msg-' + n + '" class="block text-sm font-semibold text-notte mb-1.5">Due righe sul tuo contesto di lavoro <span class="font-normal text-inchiostro/45">(facoltativo)</span></label>' +
          '<textarea id="rq-msg-' + n + '" name="messaggio" rows="3" placeholder="Per esempio: libera professione, servizio pubblico, comunità. Nessun dato che renda riconoscibili i pazienti."' +
            ' class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte placeholder:text-inchiostro/40 focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '</div>' +
        '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">' +
        '<p data-esito class="hidden rounded-xl px-4 py-3 text-sm" role="status" aria-live="polite"></p>' +
        '<button type="submit" class="w-full inline-flex items-center justify-center gap-2 bg-notte text-white text-base font-semibold px-6 py-4 rounded-full hover:bg-mirtillo-700 transition-colors">' +
          'Invia la richiesta' +
        '</button>' +
        '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(WA_COLLEGHI) + '"' +
          ' target="_blank" rel="noopener" data-evento="cta_click" data-evento-etichetta="wa-supervisione-modulo"' +
          ' class="w-full inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte text-base font-semibold px-6 py-3.5 rounded-full hover:bg-crema-dark transition-colors">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i> Oppure su WhatsApp' +
        '</a>' +
        '<div class="rounded-xl bg-crema/70 px-4 py-3">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-mirtillo-700 mb-2">Cosa succede dopo</p>' +
          '<ol class="space-y-1.5 text-sm leading-relaxed text-inchiostro/75 list-decimal pl-4">' +
            '<li>Ti rispondo io, di solito entro un giorno lavorativo.</li>' +
            '<li>Ci sentiamo per un primo incontro, online o in studio a Itri, per capire che cosa ti serve.</li>' +
            '<li>Onorario e cadenza li concordiamo prima di cominciare.</li>' +
          '</ol>' +
        '</div>' +
        '<p class="text-xs leading-relaxed text-inchiostro/55">I dati servono solo a ricontattarti. Del caso parliamo in supervisione, non qui. <a href="/privacy/" class="underline underline-offset-2 hover:text-notte">Informativa</a></p>' +
      '</form>'
    );
  }

  function modulo(n, chiediSetting, tema, setting) {
    return (
      '<form novalidate class="space-y-4" data-modulo-richiesta>' +
        (chiediSetting ? sceltaSetting(n) : '') +
        sceltaOrari(n, setting) +
        campo('rq-nome-' + n, T.nome + ' <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'text',
              'name="nome" autocomplete="name" required placeholder="' + T.nomePh + '"') +
        campo('rq-email-' + n, T.email + ' <span class="text-mirtillo-700" aria-hidden="true">*</span>', 'email',
              'name="email" autocomplete="email" required inputmode="email" placeholder="' + T.emailPh + '"') +
        campo('rq-tel-' + n, T.tel + ' <span class="font-normal text-inchiostro/45">' + T.facoltativo + '</span>', 'tel',
              'name="telefono" autocomplete="tel" inputmode="tel" placeholder="+39 …"') +
        '<div>' +
          '<label for="rq-msg-' + n + '" class="block text-sm font-semibold text-notte mb-1.5">' + T.msg + ' <span class="font-normal text-inchiostro/45">' + T.msgNota + '</span></label>' +
          '<textarea id="rq-msg-' + n + '" name="messaggio" rows="3" placeholder="' + T.msgPh + '"' +
            ' class="w-full rounded-xl border border-tortora-dark bg-crema/60 px-4 py-3 text-[0.97rem] text-notte placeholder:text-inchiostro/40 focus:border-mirtillo-600 focus:bg-white focus:ring-0 transition-colors resize-y"></textarea>' +
        '</div>' +
        '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">' +
        '<p data-esito class="hidden rounded-xl px-4 py-3 text-sm" role="status" aria-live="polite"></p>' +
        '<button type="submit" class="w-full inline-flex items-center justify-center gap-2 bg-notte text-white text-base font-semibold px-6 py-4 rounded-full hover:bg-mirtillo-700 transition-colors">' +
          T.invia +
        '</button>' +
        '<a href="' + linkWhatsApp(tema, setting) + '"' +
          ' target="_blank" rel="noopener" data-evento="cta_click" data-evento-etichetta="wa-destinazione"' +
          ' class="w-full inline-flex items-center justify-center gap-2 border border-tortora-dark text-notte text-base font-semibold px-6 py-3.5 rounded-full hover:bg-crema-dark transition-colors">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i> ' + T.wa +
        '</a>' +
        // Chi sta per scrivere a uno psicoterapeuta per la prima volta si
        // chiede soprattutto che cosa succederà dopo: lo dico in tre righe.
        '<div class="rounded-xl bg-crema/70 px-4 py-3">' +
          '<p class="text-xs font-semibold uppercase tracking-[0.12em] text-mirtillo-700 mb-2">' + T.dopo + '</p>' +
          '<ol class="space-y-1.5 text-sm leading-relaxed text-inchiostro/75 list-decimal pl-4">' +
            T.passi.map(function (p) { return '<li>' + p + '</li>'; }).join('') +
          '</ol>' +
        '</div>' +
        '<p class="text-xs leading-relaxed text-inchiostro/55">' + T.privacy + ' <a href="/privacy/" class="underline underline-offset-2 hover:text-notte">' + T.informativa + '</a></p>' +
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
    return T.orarioScelto + orari[0];
  }

  function collega(contenitore, n) {
    var settingFisso = contenitore.getAttribute('data-setting') || '';
    var tema = contenitore.getAttribute('data-tema') || '';
    var colleghi = contenitore.getAttribute('data-variante') === 'colleghi';
    contenitore.innerHTML = colleghi ? moduloColleghi(n) : modulo(n, !settingFisso, tema, settingFisso);
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
        esito(form, T.erroreNome, true);
        form.nome.focus();
        return;
      }
      if (!emailValida(dati.email)) {
        esito(form, T.erroreEmail, true);
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
          source: colleghi ? 'supervisione' : 'contatto',
          lang: colleghi ? 'it' : LINGUA,
          consent: false,
          setting: setting,
          topics: [tema, colleghi && form.tipo ? form.tipo.value : ''].filter(Boolean),
          slot: colleghi ? '' : slotScelto(form),
          message: [dati.orari.length ? testoOrari(dati.orari) : '', dati.messaggio].filter(Boolean).join('\n\n'),
          page: location.pathname,
          referrer: document.referrer,
          hp: ''
        })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http')); })
        .then(function (r) {
          if (!r || !r.ok) { throw new Error('rifiutata'); }
          // Ha già un colloquio: niente seconda prenotazione, ma il messaggio
          // mi arriva e la persona riceve di nuovo il link al suo appuntamento.
          if (r.gia_prenotato) {
            esito(form, T.gia[0] + r.quando + T.gia[1], false);
            form.reset();
            return;
          }
          esito(form, colleghi
            ? 'Ho ricevuto la tua richiesta, grazie. Ti rispondo io, di solito entro un giorno lavorativo.'
            : dati.orari.length
            ? T.okOrario[0] + dati.orari[0] + T.okOrario[1]
            : T.ok, false);
          form.reset();
          var orari = form.querySelector('[data-orari]');
          if (orari) { orari.dispatchEvent(new Event('change')); }
          if (window.SiteAnalytics) {
            window.SiteAnalytics.evento('contatto_inviato', { fonte: colleghi ? 'supervisione' : 'destinazione', pagina: location.pathname, orari: dati.orari.length });
          }
          if (window.ConsensoCookie) { window.ConsensoCookie.conversioneModulo({ orario: dati.orari.length > 0 }); }
        })
        .catch(function () {
          // Server irraggiungibile: apro la posta col messaggio già pronto.
          window.location.href = 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent('Richiesta primo colloquio, ' + dati.nome) +
            '&body=' + encodeURIComponent(corpo(dati));
          esito(form, T.posta + EMAIL + T.postaWa, false);
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
          ' class="flex-none inline-flex items-center justify-center gap-2 bg-white text-notte border border-tortora-dark font-semibold px-5 py-4 rounded-full" aria-label="' + T.ariaWa + '">' +
          '<i data-lucide="message-circle" class="w-5 h-5" aria-hidden="true"></i><span class="hidden sm:inline">WhatsApp</span>' +
        '</a>' +
        '<a href="#richiesta" data-evento="cta_click" data-evento-etichetta="barra-colloquio" class="flex-1 flex items-center justify-center bg-lume text-notte font-semibold px-6 py-4 rounded-full">' +
          T.barra +
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
