/* ============================================================
   admin.js — il pannello
   ------------------------------------------------------------
   Nessuna libreria, nessuna CDN: solo fetch verso Supabase. Meno
   dipendenze significa meno cose che possono rompersi da sole nel
   tempo, e nessun terzo che vede i dati passare.

   Come sta in piedi la sicurezza, in due righe:
   • la chiave qui sotto è PUBBLICA per progetto — da sola non apre
     nulla, perché le regole RLS del database non concedono un
     bell'niente a chi non ha fatto login;
   • dopo il login, il permesso non viene dal browser ma dal database,
     che confronta l'email del token con la tabella admin_emails.
   Modificare questo file, quindi, non dà accesso a niente.
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     Configurazione
     ============================================================ */

  var CONFIG = {
    url: 'https://ynmxgdcikqlgcupfszza.supabase.co',
    // Chiave pubblicabile: pensata per stare nel browser (vedi sopra).
    chiave: 'sb_publishable_1aC6c8mV1w4clhwbJWKd_A_OGL4VZEp',
    // Supabase riconosce le persone dall'email. Qui traduco il nome
    // utente breve nell'email vera, così posso scrivere solo "alberto".
    alias: { alberto: 'alberto.delbove.psicoterapeuta@gmail.com' }
  };

  var CHIAVE_SESSIONE = 'adb-pannello-sessione';

  /* ============================================================
     Sessione e chiamate al server
     ============================================================ */

  var sessione = null;

  function caricaSessione() {
    try {
      var grezzo = localStorage.getItem(CHIAVE_SESSIONE) ||
                   sessionStorage.getItem(CHIAVE_SESSIONE);
      sessione = grezzo ? JSON.parse(grezzo) : null;
    } catch (e) { sessione = null; }
    return sessione;
  }

  function salvaSessione(s, permanente) {
    sessione = s;
    var deposito = permanente ? localStorage : sessionStorage;
    (permanente ? sessionStorage : localStorage).removeItem(CHIAVE_SESSIONE);
    if (s) { deposito.setItem(CHIAVE_SESSIONE, JSON.stringify(s)); }
    else {
      localStorage.removeItem(CHIAVE_SESSIONE);
      sessionStorage.removeItem(CHIAVE_SESSIONE);
    }
  }

  function scaduta() {
    // Rinnovo con un minuto di anticipo: meglio un giro in più che una
    // richiesta rifiutata a metà di un invio.
    return !sessione || !sessione.expires_at || Date.now() > (sessione.expires_at - 60000);
  }

  function auth(percorso, corpo) {
    return fetch(CONFIG.url + '/auth/v1/' + percorso, {
      method: 'POST',
      headers: { 'apikey': CONFIG.chiave, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) { throw new Error(d.error_description || d.msg || d.message || 'Accesso non riuscito'); }
        return d;
      });
    });
  }

  function accedi(email, password, permanente) {
    return auth('token?grant_type=password', { email: email, password: password })
      .then(function (d) {
        salvaSessione({
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_at: Date.now() + (d.expires_in * 1000),
          email: (d.user && d.user.email) || email
        }, permanente);
        return sessione;
      });
  }

  function rinnova() {
    if (!sessione || !sessione.refresh_token) { return Promise.reject(new Error('sessione assente')); }
    var permanente = !!localStorage.getItem(CHIAVE_SESSIONE);
    return auth('token?grant_type=refresh_token', { refresh_token: sessione.refresh_token })
      .then(function (d) {
        salvaSessione({
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_at: Date.now() + (d.expires_in * 1000),
          email: (d.user && d.user.email) || sessione.email
        }, permanente);
        return sessione;
      });
  }

  /** Garantisce un token valido prima di ogni chiamata. */
  function conToken() {
    if (!sessione) { return Promise.reject(new Error('non autenticato')); }
    if (!scaduta()) { return Promise.resolve(sessione); }
    return rinnova();
  }

  function esci() {
    salvaSessione(null);
    location.reload();
  }

  /** Lettura/scrittura sulle tabelle (PostgREST). Le regole RLS decidono cosa passa. */
  function db(percorso, opzioni) {
    opzioni = opzioni || {};
    return conToken().then(function (s) {
      var intestazioni = {
        'apikey': CONFIG.chiave,
        'Authorization': 'Bearer ' + s.access_token,
        'Content-Type': 'application/json'
      };
      if (opzioni.conteggio) { intestazioni.Prefer = 'count=exact'; }
      if (opzioni.ritorna) { intestazioni.Prefer = 'return=representation'; }

      return fetch(CONFIG.url + '/rest/v1/' + percorso, {
        method: opzioni.metodo || 'GET',
        headers: intestazioni,
        body: opzioni.corpo ? JSON.stringify(opzioni.corpo) : undefined
      }).then(function (r) {
        var totale = r.headers.get('content-range');
        return r.text().then(function (t) {
          var d = t ? JSON.parse(t) : null;
          if (!r.ok) { throw new Error((d && (d.message || d.hint)) || 'Errore ' + r.status); }
          if (opzioni.conteggio && totale) { d.__totale = parseInt(totale.split('/')[1], 10) || 0; }
          return d;
        });
      });
    });
  }

  function rpc(nome, argomenti) {
    return db('rpc/' + nome, { metodo: 'POST', corpo: argomenti || {} });
  }

  /** Le azioni che richiedono i segreti passano dalla Edge Function. */
  function server(azione, dati) {
    return conToken().then(function (s) {
      return fetch(CONFIG.url + '/functions/v1/admin', {
        method: 'POST',
        headers: {
          'apikey': CONFIG.chiave,
          'Authorization': 'Bearer ' + s.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.assign({ action: azione }, dati || {}))
      }).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok || d.ok === false) { throw new Error(d.errore || 'Errore ' + r.status); }
          return d;
        });
      });
    });
  }

  /* ============================================================
     Piccoli aiuti
     ============================================================ */

  var $ = function (sel, dove) { return (dove || document).querySelector(sel); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var FORMATO_DATA = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  var FORMATO_ORA = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  function data(iso) { return iso ? FORMATO_DATA.format(new Date(iso)) : '—'; }
  function dataOra(iso) { return iso ? FORMATO_ORA.format(new Date(iso)) : '—'; }

  function numero(n) { return new Intl.NumberFormat('it-IT').format(n || 0); }

  function durata(secondi) {
    if (!secondi) { return '—'; }
    var m = Math.floor(secondi / 60);
    var s = Math.round(secondi % 60);
    return m ? m + 'm ' + s + 's' : s + 's';
  }

  function iso(d) { return new Date(d).toISOString(); }

  function giorniFa(n) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }

  function domani() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  }

  /** Messaggio di esito dentro un contenitore. */
  function esito(dove, testo, tipo) {
    var el = typeof dove === 'string' ? $(dove) : dove;
    if (!el) { return; }
    if (!testo) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="avviso ' + (tipo || 'ok') + '">' + esc(testo) + '</div>';
  }

  function occupato(bottone, sì, testoAttesa) {
    if (!bottone) { return; }
    if (sì) {
      bottone.dataset.testo = bottone.textContent;
      bottone.textContent = testoAttesa || 'Attendi…';
      bottone.disabled = true;
    } else {
      if (bottone.dataset.testo) { bottone.textContent = bottone.dataset.testo; }
      bottone.disabled = false;
    }
  }

  /* Nomi leggibili al posto delle sigle tecniche. */
  var NOMI_FONTE = {
    'newsletter': 'Newsletter',
    'compendi': 'Compendi',
    'contatto': 'Modulo contatti',
    'test-junghiano': 'Test junghiano',
    'test-burnout': 'Test burnout',
    'test-adhd': 'Test ADHD',
    'test-domanda': 'Test della domanda',
    'test': 'Test',
    'import': 'Importazione',
    'sconosciuta': 'Sconosciuta'
  };
  function nomeFonte(f) { return NOMI_FONTE[f] || f || '—'; }

  var NOMI_STATO = {
    pending: 'Da confermare', confirmed: 'Confermato',
    unsubscribed: 'Disiscritto', bounced: 'Rimbalzato'
  };

  var NOMI_EVENTO = {
    test_iniziato: 'Test iniziati',
    test_completato: 'Test completati',
    email_lasciata: 'Email lasciate',
    contatto_inviato: 'Richieste di colloquio',
    compendio_aperto: 'Compendi aperti',
    articolo_aperto: 'Articoli aperti',
    cta_click: 'Click sulle CTA'
  };
  function nomeEvento(e) { return NOMI_EVENTO[e] || e; }

  /* ============================================================
     Grafico a linea + barre, disegnato a mano in SVG
     ------------------------------------------------------------
     Una libreria di grafici pesa più di tutto il resto del pannello
     messo insieme. Qui servono una linea e delle barre: si fanno con
     una manciata di conti.
     ============================================================ */

  function grafico(punti, opzioni) {
    opzioni = opzioni || {};
    if (!punti.length) { return '<div class="vuoto">Nessun dato in questo periodo.</div>'; }

    var L = 900, A = 240;
    var pad = { su: 14, giù: 26, sx: 42, dx: 10 };
    var largo = L - pad.sx - pad.dx;
    var alto = A - pad.su - pad.giù;

    var maxLinea = Math.max.apply(null, punti.map(function (p) { return p.linea; }));
    var maxBarra = Math.max.apply(null, punti.map(function (p) { return p.barra; }));
    // Un massimo di zero renderebbe il grafico una riga piatta sul bordo:
    // tengo almeno 1 così la scala resta leggibile.
    var scalaL = Math.max(maxLinea, 1);
    var scalaB = Math.max(maxBarra, 1);

    var passo = punti.length > 1 ? largo / (punti.length - 1) : 0;
    var x = function (i) { return pad.sx + (punti.length > 1 ? i * passo : largo / 2); };
    var y = function (v) { return pad.su + alto - (v / scalaL) * alto; };

    var svg = [];

    // Griglia orizzontale e valori sull'asse
    for (var g = 0; g <= 3; g++) {
      var vy = pad.su + (alto / 3) * g;
      var valore = Math.round(scalaL - (scalaL / 3) * g);
      svg.push('<line class="griglia-linea" x1="' + pad.sx + '" y1="' + vy + '" x2="' + (L - pad.dx) + '" y2="' + vy + '"/>');
      svg.push('<text class="asse" x="' + (pad.sx - 7) + '" y="' + (vy + 4) + '" text-anchor="end">' + numero(valore) + '</text>');
    }

    // Barre (contatti raccolti)
    if (maxBarra > 0) {
      var largoBarra = Math.max(2, Math.min(22, largo / punti.length * 0.45));
      punti.forEach(function (p, i) {
        if (!p.barra) { return; }
        var h = (p.barra / scalaB) * alto * 0.62;
        svg.push('<rect class="barra-contatti" x="' + (x(i) - largoBarra / 2).toFixed(1) +
          '" y="' + (pad.su + alto - h).toFixed(1) + '" width="' + largoBarra.toFixed(1) +
          '" height="' + h.toFixed(1) + '" rx="2"><title>' +
          esc(p.etichettaLunga) + ': ' + p.barra + ' ' + esc(opzioni.nomeBarra || 'contatti') +
          '</title></rect>');
      });
    }

    // Area + linea (visite)
    var d = punti.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.linea).toFixed(1); }).join(' ');
    svg.push('<path class="area-visite" d="' + d + ' L' + x(punti.length - 1).toFixed(1) + ' ' +
      (pad.su + alto) + ' L' + x(0).toFixed(1) + ' ' + (pad.su + alto) + ' Z"/>');
    svg.push('<path class="linea-visite" d="' + d + '"/>');

    // Punti trasparenti larghi: danno il tooltip anche su schermi piccoli
    punti.forEach(function (p, i) {
      svg.push('<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.linea).toFixed(1) +
        '" r="9" fill="transparent"><title>' + esc(p.etichettaLunga) + ': ' +
        p.linea + ' ' + esc(opzioni.nomeLinea || 'visite') + '</title></circle>');
    });

    // Etichette in basso: al massimo otto, altrimenti si sovrappongono
    var ogni = Math.max(1, Math.ceil(punti.length / 8));
    punti.forEach(function (p, i) {
      if (i % ogni && i !== punti.length - 1) { return; }
      svg.push('<text class="asse" x="' + x(i).toFixed(1) + '" y="' + (A - 7) +
        '" text-anchor="middle">' + esc(p.etichetta) + '</text>');
    });

    return '<svg class="grafico" viewBox="0 0 ' + L + ' ' + A + '" preserveAspectRatio="none" role="img">' +
      svg.join('') + '</svg>' +
      '<div class="legenda">' +
      '<span><i style="background:var(--mirtillo-700)"></i>' + esc(opzioni.nomeLinea || 'Visite') + '</span>' +
      '<span><i style="background:var(--verde)"></i>' + esc(opzioni.nomeBarra || 'Contatti raccolti') + '</span>' +
      '</div>';
  }

  /** Riga di tabella con barra proporzionale sullo sfondo. */
  function misura(etichetta, valore, massimo, extra) {
    var pct = massimo > 0 ? (valore / massimo) * 100 : 0;
    return '<tr><td class="misura"><div class="riempi" style="width:' + pct.toFixed(1) + '%"></div>' +
      '<span>' + etichetta + '</span></td>' +
      '<td class="num">' + numero(valore) + '</td>' +
      (extra != null ? '<td class="num tenue">' + extra + '</td>' : '') + '</tr>';
  }

  /* ============================================================
     Stato dell'applicazione
     ============================================================ */

  var stato = {
    sezione: 'cruscotto',
    impostazioni: null,
    periodo: { giorni: 30, bucket: 'day' },
    contatti: { filtri: {}, righe: [], pagina: 0, totale: 0 },
    richieste: { righe: [], filtro: '' },
    newsletter: { elenco: [], corrente: null }
  };

  var DIMENSIONE_PAGINA = 50;

  /* ============================================================
     Navigazione
     ============================================================ */

  function vai(sezione) {
    stato.sezione = sezione;
    Array.prototype.forEach.call(document.querySelectorAll('.voce'), function (v) {
      v.classList.toggle('attiva', v.dataset.sezione === sezione);
    });
    location.hash = sezione;
    var disegna = {
      cruscotto: cruscotto,
      contatti: contatti,
      richieste: richieste,
      newsletter: newsletter,
      statistiche: statistiche,
      impostazioni: impostazioni
    }[sezione];
    if (disegna) { disegna(); }
  }

  function intestazione(titolo, sotto, azioni) {
    return '<div class="intestazione"><div><h1>' + esc(titolo) + '</h1>' +
      (sotto ? '<p>' + esc(sotto) + '</p>' : '') + '</div>' +
      (azioni ? '<div class="barra-azioni">' + azioni + '</div>' : '') + '</div>';
  }

  function caricamento() {
    $('#contenuto').innerHTML = '<div class="vuoto">Carico…</div>';
  }

  /* ============================================================
     CRUSCOTTO
     ============================================================ */

  function cruscotto() {
    caricamento();
    var da = giorniFa(29), a = domani();

    Promise.all([
      rpc('stats_overview', { p_from: iso(da), p_to: iso(a) }),
      rpc('stats_timeseries', { p_from: iso(da), p_to: iso(a), p_bucket: 'day' }),
      db('contacts?select=id,email,name,first_source,status,created_at&order=created_at.desc&limit=6'),
      db('messages?select=id,name,email,status,created_at&order=created_at.desc&limit=6'),
      db('contacts?select=id&status=eq.pending&consent_newsletter=is.true&limit=1', { conteggio: true })
    ]).then(function (r) {
      var o = r[0], serie = r[1], ultimiContatti = r[2], ultimeRichieste = r[3];
      var inAttesa = r[4].__totale || 0;

      var avvisi = '';
      var smtpOk = stato.impostazioni && stato.impostazioni.smtp && stato.impostazioni.smtp.host &&
                   stato.impostazioni.smtp.pass;
      if (!smtpOk) {
        avvisi += '<div class="avviso nota">Le email di conferma non partono ancora: manca la ' +
          'configurazione SMTP. Vai in <b>Impostazioni</b> e incolla la password per le app.</div>';
      }
      if (inAttesa > 0) {
        avvisi += '<div class="avviso info">' + numero(inAttesa) + ' ' +
          (inAttesa === 1 ? 'persona ha lasciato l’email ma non ha ancora confermato' :
            'persone hanno lasciato l’email ma non hanno ancora confermato') +
          '. Riceveranno la newsletter solo dopo la conferma.</div>';
      }

      $('#contenuto').innerHTML =
        intestazione('Cruscotto', 'Gli ultimi 30 giorni.') +
        avvisi +
        '<div class="griglia g4" style="margin-bottom:18px">' +
          riquadro('Visite', numero(o.visits), numero(o.pageviews) + ' pagine viste') +
          riquadro('Email raccolte', numero(o.contacts), numero(o.confirmed) + ' confermate') +
          riquadro('Richieste colloquio', numero(o.messages), 'dal modulo contatti') +
          riquadro('Conversione', o.conversion + '%', 'visite che lasciano l’email') +
        '</div>' +

        '<div class="scheda"><h2>Andamento</h2>' +
        '<p class="aiuto">Visite giornaliere e email raccolte.</p>' +
        grafico(seriePunti(serie, 'day')) + '</div>' +

        '<div class="griglia g2" style="margin-top:18px">' +
          '<div class="scheda"><h2>Ultime email arrivate</h2><p class="aiuto">Da tutti i punti del sito.</p>' +
            elencoContattiBreve(ultimiContatti) + '</div>' +
          '<div class="scheda"><h2>Ultime richieste</h2><p class="aiuto">Dal modulo contatti.</p>' +
            elencoRichiesteBreve(ultimeRichieste) + '</div>' +
        '</div>';
    }).catch(mostraErrore);
  }

  function riquadro(etichetta, valore, nota) {
    return '<div class="numero"><div class="et">' + esc(etichetta) + '</div>' +
      '<div class="v">' + valore + '</div>' +
      (nota ? '<div class="n">' + esc(nota) + '</div>' : '') + '</div>';
  }

  function seriePunti(serie, bucket) {
    return (serie || []).map(function (r) {
      var d = new Date(r.bucket);
      var etichetta;
      if (bucket === 'hour') { etichetta = String(d.getHours()).padStart(2, '0') + ':00'; }
      else if (bucket === 'month') { etichetta = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }); }
      else { etichetta = d.getDate() + '/' + (d.getMonth() + 1); }
      return {
        etichetta: etichetta,
        etichettaLunga: data(r.bucket),
        linea: r.visits,
        barra: r.contacts
      };
    });
  }

  function elencoContattiBreve(righe) {
    if (!righe.length) { return '<div class="vuoto">Ancora nessuna email.</div>'; }
    return '<div class="tabella-avvolge"><table><tbody>' + righe.map(function (c) {
      return '<tr data-contatto="' + esc(c.id) + '" style="cursor:pointer">' +
        '<td><b>' + esc(c.email) + '</b>' + (c.name ? '<div class="tenue">' + esc(c.name) + '</div>' : '') + '</td>' +
        '<td><span class="etichetta et-fonte">' + esc(nomeFonte(c.first_source)) + '</span></td>' +
        '<td><span class="etichetta et-' + esc(c.status) + '">' + esc(NOMI_STATO[c.status]) + '</span></td>' +
        '<td class="tenue">' + data(c.created_at) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function elencoRichiesteBreve(righe) {
    if (!righe.length) { return '<div class="vuoto">Ancora nessuna richiesta.</div>'; }
    return '<div class="tabella-avvolge"><table><tbody>' + righe.map(function (m) {
      return '<tr data-richiesta="' + esc(m.id) + '" style="cursor:pointer">' +
        '<td><b>' + esc(m.name || m.email) + '</b><div class="tenue">' + esc(m.email) + '</div></td>' +
        '<td><span class="etichetta et-' + esc(m.status) + '">' + esc(m.status) + '</span></td>' +
        '<td class="tenue">' + data(m.created_at) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     CONTATTI
     ============================================================ */

  function contatti(mantieniPagina) {
    if (!mantieniPagina) { stato.contatti.pagina = 0; stato.contatti.righe = []; }

    if (!$('#tabella-contatti')) {
      $('#contenuto').innerHTML =
        intestazione('Contatti', 'Ogni email lasciata sul sito, da qualunque punto.',
          '<button class="bottone secondario" id="btn-csv">Esporta CSV</button>') +
        '<div class="scheda">' +
        '<div class="filtri">' +
          '<div class="campo cerca"><label for="f-cerca">Cerca</label>' +
            '<input type="search" id="f-cerca" placeholder="email o nome"></div>' +
          '<div class="campo"><label for="f-stato">Stato</label><select id="f-stato">' +
            '<option value="">Tutti</option>' +
            '<option value="confirmed">Confermati</option>' +
            '<option value="pending">Da confermare</option>' +
            '<option value="unsubscribed">Disiscritti</option>' +
          '</select></div>' +
          '<div class="campo"><label for="f-fonte">Provenienza</label><select id="f-fonte">' +
            '<option value="">Tutte</option>' +
          '</select></div>' +
          '<div class="campo"><label for="f-da">Dal</label><input type="date" id="f-da"></div>' +
          '<div class="campo"><label for="f-al">Al</label><input type="date" id="f-al"></div>' +
        '</div>' +
        '<div id="riepilogo-contatti"></div>' +
        '<div class="tabella-avvolge"><table id="tabella-contatti">' +
        '<thead><tr><th>Email</th><th>Nome</th><th>Provenienza</th><th>Stato</th>' +
        '<th>Newsletter</th><th>Arrivato</th></tr></thead><tbody></tbody></table></div>' +
        '<div id="altro-contatti" style="margin-top:16px"></div>' +
        '</div>';

      ['#f-cerca', '#f-stato', '#f-fonte', '#f-da', '#f-al'].forEach(function (sel) {
        var el = $(sel);
        var evento = sel === '#f-cerca' ? 'input' : 'change';
        var attesa;
        el.addEventListener(evento, function () {
          clearTimeout(attesa);
          attesa = setTimeout(function () { contatti(false); }, evento === 'input' ? 300 : 0);
        });
      });
      $('#btn-csv').addEventListener('click', esportaCsv);
      riempiFonti();
    }

    var q = query();
    db('contacts?select=id,email,name,first_source,status,consent_newsletter,created_at,confirmed_at' +
       q + '&order=created_at.desc&limit=' + DIMENSIONE_PAGINA +
       '&offset=' + (stato.contatti.pagina * DIMENSIONE_PAGINA), { conteggio: true })
      .then(function (righe) {
        stato.contatti.totale = righe.__totale || righe.length;
        stato.contatti.righe = stato.contatti.pagina === 0 ? righe : stato.contatti.righe.concat(righe);
        disegnaContatti();
      }).catch(mostraErrore);
  }

  /** Traduce i filtri in una query PostgREST. */
  function query() {
    var q = '';
    var cerca = ($('#f-cerca') || {}).value;
    var stat = ($('#f-stato') || {}).value;
    var fonte = ($('#f-fonte') || {}).value;
    var da = ($('#f-da') || {}).value;
    var al = ($('#f-al') || {}).value;

    if (cerca && cerca.trim()) {
      var t = encodeURIComponent('*' + cerca.trim() + '*');
      q += '&or=(email.ilike.' + t + ',name.ilike.' + t + ')';
    }
    if (stat) { q += '&status=eq.' + encodeURIComponent(stat); }
    if (fonte) { q += '&first_source=eq.' + encodeURIComponent(fonte); }
    if (da) { q += '&created_at=gte.' + encodeURIComponent(da + 'T00:00:00Z'); }
    if (al) { q += '&created_at=lte.' + encodeURIComponent(al + 'T23:59:59Z'); }
    return q;
  }

  function riempiFonti() {
    rpc('stats_contact_sources', { p_from: iso(new Date(2020, 0, 1)), p_to: iso(domani()) })
      .then(function (fonti) {
        var sel = $('#f-fonte');
        if (!sel) { return; }
        fonti.forEach(function (f) {
          var o = document.createElement('option');
          o.value = f.source;
          o.textContent = nomeFonte(f.source) + ' (' + f.contacts + ')';
          sel.appendChild(o);
        });
      });
  }

  function disegnaContatti() {
    var righe = stato.contatti.righe;
    var corpo = $('#tabella-contatti').querySelector('tbody');

    $('#riepilogo-contatti').innerHTML =
      '<p class="aiuto">' + numero(stato.contatti.totale) +
      (stato.contatti.totale === 1 ? ' contatto' : ' contatti') +
      ' con questi filtri. Clicca una riga per vedere la scheda completa.</p>';

    if (!righe.length) {
      corpo.innerHTML = '<tr><td colspan="6"><div class="vuoto"><strong>Nessun contatto</strong>' +
        'Con questi filtri non c’è niente da mostrare.</div></td></tr>';
      $('#altro-contatti').innerHTML = '';
      return;
    }

    corpo.innerHTML = righe.map(function (c) {
      return '<tr data-contatto="' + esc(c.id) + '" style="cursor:pointer">' +
        '<td><b>' + esc(c.email) + '</b></td>' +
        '<td>' + esc(c.name || '—') + '</td>' +
        '<td><span class="etichetta et-fonte">' + esc(nomeFonte(c.first_source)) + '</span></td>' +
        '<td><span class="etichetta et-' + esc(c.status) + '">' + esc(NOMI_STATO[c.status]) + '</span></td>' +
        '<td>' + (c.consent_newsletter ? 'Sì' : '<span class="tenue">No</span>') + '</td>' +
        '<td class="tenue">' + data(c.created_at) + '</td></tr>';
    }).join('');

    $('#altro-contatti').innerHTML = righe.length < stato.contatti.totale
      ? '<button class="bottone secondario" id="btn-altro">Mostra altri ' +
        Math.min(DIMENSIONE_PAGINA, stato.contatti.totale - righe.length) + '</button>'
      : '';
    if ($('#btn-altro')) {
      $('#btn-altro').addEventListener('click', function () {
        stato.contatti.pagina++;
        contatti(true);
      });
    }
  }

  /** Esporta ciò che i filtri stanno mostrando, non solo la pagina a video. */
  function esportaCsv() {
    var btn = $('#btn-csv');
    occupato(btn, true, 'Preparo…');
    db('contacts?select=email,name,phone,lang,first_source,last_source,status,consent_newsletter,consent_at,confirmed_at,created_at' +
       query() + '&order=created_at.desc&limit=10000')
      .then(function (righe) {
        var colonne = ['email', 'name', 'phone', 'lang', 'first_source', 'last_source',
                       'status', 'consent_newsletter', 'consent_at', 'confirmed_at', 'created_at'];
        var testate = ['Email', 'Nome', 'Telefono', 'Lingua', 'Prima provenienza', 'Ultima provenienza',
                       'Stato', 'Consenso newsletter', 'Consenso il', 'Confermato il', 'Arrivato il'];
        var csv = [testate.join(',')].concat(righe.map(function (r) {
          return colonne.map(function (c) {
            var v = r[c];
            if (v == null) { return ''; }
            // Le virgolette dentro un campo CSV si raddoppiano: è lo standard.
            return '"' + String(v).replace(/"/g, '""') + '"';
          }).join(',');
        })).join('\n');

        // Il BOM iniziale serve a Excel per capire che è UTF-8: senza,
        // le accentate diventano geroglifici.
        var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'contatti-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        occupato(btn, false);
      }).catch(function (e) { occupato(btn, false); alert(e.message); });
  }

  /* ---------- Scheda di un contatto ---------- */

  function schedaContatto(id) {
    Promise.all([
      db('contacts?select=*&id=eq.' + encodeURIComponent(id)),
      db('contact_events?select=*&contact_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=50'),
      db('messages?select=id,created_at,status&contact_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc')
    ]).then(function (r) {
      var c = r[0][0], eventi = r[1], msg = r[2];
      if (!c) { return; }

      apriCassetto(c.email,
        '<dl class="dati">' +
          riga('Nome', c.name || '—') +
          riga('Telefono', c.phone || '—') +
          riga('Stato', '<span class="etichetta et-' + esc(c.status) + '">' + esc(NOMI_STATO[c.status]) + '</span>') +
          riga('Consenso newsletter', c.consent_newsletter ? 'Sì, dato il ' + dataOra(c.consent_at) : 'No') +
          riga('Confermato il', dataOra(c.confirmed_at)) +
          riga('Disiscritto il', dataOra(c.unsubscribed_at)) +
          riga('Lingua', c.lang) +
          riga('Prima provenienza', nomeFonte(c.first_source)) +
          riga('Ultima provenienza', nomeFonte(c.last_source)) +
          riga('Arrivato il', dataOra(c.created_at)) +
          riga('Richieste inviate', msg.length ? String(msg.length) : '—') +
        '</dl>' +

        '<h3 style="margin:26px 0 10px;font-size:16px">Dove ha lasciato l’email</h3>' +
        (eventi.length
          ? '<div class="scheda" style="padding:4px 16px"><table><tbody>' + eventi.map(function (e) {
              return '<tr><td><span class="etichetta et-fonte">' + esc(nomeFonte(e.source)) + '</span></td>' +
                '<td class="tenue">' + dataOra(e.created_at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="tenue">Nessun passaggio registrato.</p>') +

        '<h3 style="margin:26px 0 10px;font-size:16px">Prova del consenso</h3>' +
        '<div class="scheda mono" style="font-size:12.5px;word-break:break-all">' +
          esc(JSON.stringify(c.consent_proof || {}, null, 2)) + '</div>' +

        '<div class="barra-azioni" style="margin-top:26px">' +
          '<a class="bottone secondario" href="mailto:' + esc(c.email) + '">Scrivi</a>' +
          '<button class="bottone pericolo spinta" data-elimina="' + esc(c.id) + '">Elimina definitivamente</button>' +
        '</div>' +
        '<p class="tenue" style="font-size:12.5px;margin-top:10px">L’eliminazione cancella il contatto e ' +
        'tutta la sua storia. È il modo di rispondere a una richiesta di cancellazione dati (GDPR, art. 17).</p>'
      );
    }).catch(mostraErrore);
  }

  function riga(etichetta, valore) {
    return '<div><dt>' + esc(etichetta) + '</dt><dd>' + valore + '</dd></div>';
  }

  function eliminaContatto(id) {
    if (!confirm('Eliminare questo contatto e tutta la sua storia? L’operazione non si può annullare.')) { return; }
    db('contacts?id=eq.' + encodeURIComponent(id), { metodo: 'DELETE' })
      .then(function () { chiudiCassetto(); contatti(false); })
      .catch(function (e) { alert(e.message); });
  }

  /* ============================================================
     RICHIESTE (modulo contatti)
     ============================================================ */

  function richieste() {
    caricamento();
    db('messages?select=*&order=created_at.desc&limit=200').then(function (righe) {
      stato.richieste.righe = righe;
      $('#contenuto').innerHTML =
        intestazione('Richieste di primo colloquio',
          'Chi ha compilato il modulo contatti. Il messaggio arriva anche per email.') +
        '<div class="scheda">' +
        (righe.length
          ? '<div class="tabella-avvolge"><table><thead><tr><th>Persona</th><th>Temi</th>' +
            '<th>Setting</th><th>Stato</th><th>Trello</th><th>Arrivata</th></tr></thead><tbody>' +
            righe.map(function (m) {
              return '<tr data-richiesta="' + esc(m.id) + '" style="cursor:pointer">' +
                '<td><b>' + esc(m.name || '—') + '</b><div class="tenue">' + esc(m.email) + '</div></td>' +
                '<td>' + (m.topics && m.topics.length
                  ? m.topics.slice(0, 2).map(function (t) {
                      return '<span class="etichetta et-fonte">' + esc(t) + '</span>';
                    }).join(' ') + (m.topics.length > 2 ? ' <span class="tenue">+' + (m.topics.length - 2) + '</span>' : '')
                  : '<span class="tenue">—</span>') + '</td>' +
                '<td class="tenue">' + esc(m.setting || '—') + '</td>' +
                '<td><span class="etichetta et-' + esc(m.status) + '">' + esc(m.status) + '</span></td>' +
                '<td>' + (m.trello_card_url
                  ? '<a href="' + esc(m.trello_card_url) + '" target="_blank" rel="noopener">apri</a>'
                  : '<span class="tenue">—</span>') + '</td>' +
                '<td class="tenue">' + data(m.created_at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vuoto"><strong>Ancora nessuna richiesta</strong>' +
            'Quando qualcuno compilerà il modulo contatti, comparirà qui.</div>') +
        '</div>';
    }).catch(mostraErrore);
  }

  function schedaRichiesta(id) {
    var m = stato.richieste.righe.filter(function (x) { return x.id === id; })[0];
    var promessa = m ? Promise.resolve([m]) : db('messages?select=*&id=eq.' + encodeURIComponent(id));

    promessa.then(function (r) {
      var msg = r[0];
      if (!msg) { return; }

      apriCassetto(msg.name || msg.email,
        '<dl class="dati">' +
          riga('Email', '<a href="mailto:' + esc(msg.email) + '">' + esc(msg.email) + '</a>') +
          riga('Telefono', msg.phone ? '<a href="tel:' + esc(msg.phone) + '">' + esc(msg.phone) + '</a>' : '—') +
          riga('Setting', msg.setting || '—') +
          riga('Temi', (msg.topics || []).join(' · ') || '—') +
          riga('Lingua', msg.lang || 'it') +
          riga('Arrivata', dataOra(msg.created_at)) +
        '</dl>' +
        (msg.body ? '<div class="testo-messaggio">' + esc(msg.body) + '</div>' : '') +

        '<div class="campo" style="margin-top:24px">' +
          '<label for="stato-msg">Stato</label>' +
          '<select id="stato-msg" data-msg="' + esc(msg.id) + '">' +
            ['nuovo', 'letto', 'risposto', 'archiviato'].map(function (s) {
              return '<option value="' + s + '"' + (msg.status === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

        '<div id="esito-richiesta" style="margin-top:16px"></div>' +
        '<div class="barra-azioni" style="margin-top:16px">' +
          '<a class="bottone" href="mailto:' + esc(msg.email) +
            '?subject=' + encodeURIComponent('Re: la tua richiesta di primo colloquio') + '">Rispondi</a>' +
          (msg.trello_card_url
            ? '<a class="bottone secondario" href="' + esc(msg.trello_card_url) + '" target="_blank" rel="noopener">Apri su Trello</a>'
            : '<button class="bottone secondario" id="btn-trello-msg" data-msg="' + esc(msg.id) + '">Crea scheda Trello</button>') +
        '</div>'
      );

      $('#stato-msg').addEventListener('change', function () {
        var sel = this;
        db('messages?id=eq.' + encodeURIComponent(sel.dataset.msg),
          { metodo: 'PATCH', corpo: { status: sel.value } })
          .then(function () {
            esito('#esito-richiesta', 'Stato aggiornato.', 'ok');
            var riga = stato.richieste.righe.filter(function (x) { return x.id === sel.dataset.msg; })[0];
            if (riga) { riga.status = sel.value; }
          })
          .catch(function (e) { esito('#esito-richiesta', e.message, 'ko'); });
      });

      if ($('#btn-trello-msg')) {
        $('#btn-trello-msg').addEventListener('click', function () {
          var b = this;
          occupato(b, true, 'Creo…');
          server('trello.card', { message_id: b.dataset.msg })
            .then(function (d) {
              esito('#esito-richiesta', 'Scheda creata su Trello.', 'ok');
              b.outerHTML = '<a class="bottone secondario" href="' + esc(d.url) +
                '" target="_blank" rel="noopener">Apri su Trello</a>';
            })
            .catch(function (e) { occupato(b, false); esito('#esito-richiesta', e.message, 'ko'); });
        });
      }
    }).catch(mostraErrore);
  }

  /* ============================================================
     NEWSLETTER
     ============================================================ */

  function newsletter() {
    caricamento();
    db('newsletters?select=*&order=created_at.desc&limit=100').then(function (righe) {
      stato.newsletter.elenco = righe;
      $('#contenuto').innerHTML =
        intestazione('Newsletter', 'Scrivi, controlla chi la riceve, invia.',
          '<button class="bottone" id="btn-nuova">Nuova newsletter</button>') +
        '<div class="scheda">' +
        (righe.length
          ? '<div class="tabella-avvolge"><table><thead><tr><th>Oggetto</th><th>Stato</th>' +
            '<th class="num">Destinatari</th><th class="num">Inviate</th><th>Data</th></tr></thead><tbody>' +
            righe.map(function (n) {
              return '<tr data-newsletter="' + esc(n.id) + '" style="cursor:pointer">' +
                '<td><b>' + esc(n.subject || '(senza oggetto)') + '</b></td>' +
                '<td><span class="etichetta et-' + (n.status === 'inviata' ? 'confirmed' :
                  n.status === 'bozza' ? 'pending' : 'nuovo') + '">' + esc(n.status) + '</span></td>' +
                '<td class="num">' + (n.total || '—') + '</td>' +
                '<td class="num">' + (n.sent_count || '—') +
                  (n.failed_count ? ' <span class="tenue">(' + n.failed_count + ' ko)</span>' : '') + '</td>' +
                '<td class="tenue">' + data(n.sent_at || n.created_at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vuoto"><strong>Nessuna newsletter</strong>' +
            'Comincia con «Nuova newsletter».</div>') +
        '</div>';

      $('#btn-nuova').addEventListener('click', function () { editorNewsletter(null); });
    }).catch(mostraErrore);
  }

  function editorNewsletter(id) {
    var promessa = id
      ? db('newsletters?select=*&id=eq.' + encodeURIComponent(id)).then(function (r) { return r[0]; })
      : Promise.resolve({
          subject: '', preheader: '', body_md: '', body_html: '',
          audience: { status: ['confirmed'] }, status: 'bozza'
        });

    promessa.then(function (n) {
      stato.newsletter.corrente = n;
      var inviata = n.status === 'inviata';

      $('#contenuto').innerHTML =
        intestazione(inviata ? 'Newsletter inviata' : (n.id ? 'Modifica newsletter' : 'Nuova newsletter'),
          inviata ? 'Già partita: la puoi solo rileggere.' : 'Scrivi in markdown: l’anteprima a destra è quella che arriverà.',
          '<button class="bottone secondario" id="btn-indietro">← Tutte le newsletter</button>') +

        '<div id="esito-nl"></div>' +

        '<div class="scheda"><div class="editor">' +
        '<div>' +
          '<div class="campo"><label for="nl-oggetto">Oggetto</label>' +
            '<input type="text" id="nl-oggetto" value="' + esc(n.subject) + '"' +
            (inviata ? ' disabled' : '') + ' placeholder="Quello che si legge nella casella di posta"></div>' +

          '<div class="campo"><label for="nl-preheader">Anteprima <span class="facolt">(la riga grigia sotto l’oggetto)</span></label>' +
            '<input type="text" id="nl-preheader" value="' + esc(n.preheader || '') + '"' +
            (inviata ? ' disabled' : '') + '></div>' +

          '<div class="campo"><label for="nl-corpo">Testo</label>' +
            '<textarea id="nl-corpo" rows="18"' + (inviata ? ' disabled' : '') + '>' + esc(n.body_md) + '</textarea>' +
            '<p class="aiuto" style="margin-top:7px">' +
            '<b>##</b> titolo · <b>**grassetto**</b> · <b>*corsivo*</b> · <b>[testo](indirizzo)</b> · ' +
            '<b>-</b> elenco · <b>&gt;</b> citazione · <b>---</b> linea<br>' +
            'Scrivi <b>{{nome}}</b> per infilare il nome di chi legge.</p></div>' +
        '</div>' +

        '<div>' +
          '<label>Anteprima</label>' +
          '<div class="anteprima"><div class="anteprima-corpo">' +
            '<div class="anteprima-testata">Alberto Del Bove</div>' +
            '<div id="nl-anteprima"></div>' +
          '</div></div>' +
          '<p class="aiuto" id="nl-lettura" style="margin-top:8px"></p>' +
        '</div>' +
        '</div></div>' +

        /* ---- Destinatari ---- */
        '<div class="scheda"><h2>Chi la riceve</h2>' +
        '<p class="aiuto">Solo chi ha dato il consenso e non si è disiscritto: è una regola del database, ' +
        'non una spunta di questo modulo.</p>' +
        '<div class="griglia g3">' +
          '<div class="campo"><label>Stato</label>' +
            '<label class="riga-check" style="margin-top:0"><input type="checkbox" id="a-confirmed" checked> ' +
            '<span>Confermati (consigliato)</span></label>' +
            '<label class="riga-check"><input type="checkbox" id="a-pending"> ' +
            '<span>Anche i non confermati</span></label></div>' +
          '<div class="campo"><label for="a-fonte">Provenienza</label>' +
            '<select id="a-fonte"><option value="">Tutte</option></select></div>' +
          '<div class="campo"><label for="a-lingua">Lingua</label>' +
            '<select id="a-lingua"><option value="">Tutte</option>' +
            '<option value="it">Italiano</option><option value="en">Inglese</option>' +
            '<option value="es">Spagnolo</option></select></div>' +
        '</div>' +
        '<div id="conteggio-pubblico" class="avviso info" style="margin:16px 0 0">Calcolo…</div>' +
        '</div>' +

        /* ---- Invio ---- */
        (inviata
          ? '<div class="scheda"><h2>Esito</h2><p class="aiuto">' +
            numero(n.sent_count) + ' inviate, ' + numero(n.failed_count) + ' non riuscite, su ' +
            numero(n.total) + ' destinatari. Partita il ' + dataOra(n.sent_at) + '.</p></div>'
          : '<div class="scheda"><h2>Invio</h2>' +
            '<p class="aiuto">Prima manda una prova a te stesso: è l’unico modo di vedere davvero ' +
            'come apparirà nella casella di chi legge.</p>' +
            '<div class="barra-azioni">' +
              '<button class="bottone secondario" id="btn-salva">Salva bozza</button>' +
              '<button class="bottone secondario" id="btn-prova">Mandami una prova</button>' +
              '<button class="bottone spinta" id="btn-invia">Invia a tutti</button>' +
            '</div>' +
            '<div id="avanzamento-invio"></div>' +
            '</div>');

      $('#btn-indietro').addEventListener('click', newsletter);

      if (!inviata) {
        ['#nl-oggetto', '#nl-preheader', '#nl-corpo'].forEach(function (s) {
          $(s).addEventListener('input', aggiornaAnteprima);
        });
        ['#a-confirmed', '#a-pending', '#a-fonte', '#a-lingua'].forEach(function (s) {
          $(s).addEventListener('change', contaPubblico);
        });
        $('#btn-salva').addEventListener('click', function () { salvaNewsletter(true); });
        $('#btn-prova').addEventListener('click', provaNewsletter);
        $('#btn-invia').addEventListener('click', inviaNewsletter);
      }

      // Ripristino i filtri salvati nella bozza
      var a = n.audience || {};
      if (a.status) {
        $('#a-confirmed').checked = a.status.indexOf('confirmed') >= 0;
        $('#a-pending').checked = a.status.indexOf('pending') >= 0;
      }

      rpc('stats_contact_sources', { p_from: iso(new Date(2020, 0, 1)), p_to: iso(domani()) })
        .then(function (fonti) {
          var sel = $('#a-fonte');
          fonti.forEach(function (f) {
            var o = document.createElement('option');
            o.value = f.source;
            o.textContent = nomeFonte(f.source) + ' (' + f.contacts + ')';
            sel.appendChild(o);
          });
          if (a.sources && a.sources.length) { sel.value = a.sources[0]; }
          if (a.langs && a.langs.length) { $('#a-lingua').value = a.langs[0]; }
          contaPubblico();
        });

      aggiornaAnteprima();
    }).catch(mostraErrore);
  }

  function aggiornaAnteprima() {
    var md = $('#nl-corpo').value;
    $('#nl-anteprima').innerHTML = window.AdminMarkdown.rendi(md) ||
      '<p class="tenue">L’anteprima compare mentre scrivi.</p>';
    $('#nl-lettura').textContent = md.trim()
      ? 'Circa ' + window.AdminMarkdown.minutiDiLettura(md) + ' minuti di lettura.'
      : '';
  }

  function pubblicoScelto() {
    var stati = [];
    if ($('#a-confirmed').checked) { stati.push('confirmed'); }
    if ($('#a-pending').checked) { stati.push('pending'); }
    if (!stati.length) { stati.push('confirmed'); }

    var a = { status: stati };
    if ($('#a-fonte').value) { a.sources = [$('#a-fonte').value]; }
    if ($('#a-lingua').value) { a.langs = [$('#a-lingua').value]; }
    return a;
  }

  function contaPubblico() {
    var box = $('#conteggio-pubblico');
    if (!box) { return; }
    rpc('audience_contacts', { p_audience: pubblicoScelto() })
      .then(function (righe) {
        var n = righe.length;
        box.className = 'avviso ' + (n ? 'info' : 'nota');
        box.textContent = n === 0
          ? 'Con questi filtri non riceverebbe nessuno.'
          : n === 1 ? 'Scriverai a 1 persona.' : 'Scriverai a ' + numero(n) + ' persone.';
      })
      .catch(function (e) { box.className = 'avviso ko'; box.textContent = e.message; });
  }

  /** Salva la bozza; restituisce l'id (serve prima di provare o inviare). */
  function salvaNewsletter(avvisa) {
    var n = stato.newsletter.corrente;
    var md = $('#nl-corpo').value;
    var dati = {
      subject: $('#nl-oggetto').value.trim(),
      preheader: $('#nl-preheader').value.trim(),
      body_md: md,
      body_html: window.AdminMarkdown.rendi(md),
      audience: pubblicoScelto()
    };

    if (!dati.subject) {
      esito('#esito-nl', 'Manca l’oggetto: senza, la newsletter non parte.', 'ko');
      return Promise.reject(new Error('oggetto mancante'));
    }

    var richiesta = n.id
      ? db('newsletters?id=eq.' + encodeURIComponent(n.id), { metodo: 'PATCH', corpo: dati, ritorna: true })
      : db('newsletters', { metodo: 'POST', corpo: dati, ritorna: true });

    return richiesta.then(function (r) {
      stato.newsletter.corrente = Array.isArray(r) ? r[0] : r;
      if (avvisa) { esito('#esito-nl', 'Bozza salvata.', 'ok'); }
      return stato.newsletter.corrente;
    }).catch(function (e) {
      esito('#esito-nl', e.message, 'ko');
      throw e;
    });
  }

  function provaNewsletter() {
    var b = $('#btn-prova');
    occupato(b, true, 'Invio…');
    salvaNewsletter(false)
      .then(function (n) { return server('newsletter.test', { id: n.id }); })
      .then(function (d) { esito('#esito-nl', d.messaggio, 'ok'); occupato(b, false); })
      .catch(function (e) { esito('#esito-nl', e.message, 'ko'); occupato(b, false); });
  }

  /**
   * Invia a lotti: la funzione server ne manda un blocco e dice quanti
   * ne restano, il pannello richiama finché non arriva a zero. Se qualcosa
   * si interrompe, la barra si ferma e il registro dei destinatari sa già
   * chi ha ricevuto: riprendendo, nessuno riceve due volte.
   */
  function inviaNewsletter() {
    var b = $('#btn-invia');
    var box = $('#avanzamento-invio');

    rpc('audience_contacts', { p_audience: pubblicoScelto() }).then(function (righe) {
      if (!righe.length) {
        esito('#esito-nl', 'Con questi filtri non riceverebbe nessuno.', 'ko');
        return;
      }
      if (!confirm('Inviare a ' + righe.length + ' ' +
          (righe.length === 1 ? 'persona' : 'persone') + '? Le email partite non si richiamano indietro.')) {
        return;
      }

      occupato(b, true, 'Invio in corso…');
      $('#btn-salva').disabled = true;
      $('#btn-prova').disabled = true;

      salvaNewsletter(false).then(function (n) {
        var totale = righe.length;
        var fatte = 0;

        function lotto() {
          return server('newsletter.send', { id: n.id }).then(function (d) {
            fatte = (d.totali ? d.totali.inviate + d.totali.errori : fatte + d.inviate + d.errori);
            var pct = totale ? Math.min(100, (fatte / totale) * 100) : 100;
            box.innerHTML =
              '<div class="avanzamento"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
              '<p class="aiuto">' + numero(fatte) + ' di ' + numero(totale) + ' — ' +
              (d.rimanenti ? 'continuo…' : 'finito') +
              (d.totali && d.totali.errori ? ' · ' + d.totali.errori + ' non riuscite' : '') + '</p>';

            if (d.rimanenti > 0) { return lotto(); }

            esito('#esito-nl', 'Newsletter inviata a ' + numero(d.totali ? d.totali.inviate : fatte) +
              ' persone' + (d.totali && d.totali.errori
                ? ', ' + d.totali.errori + ' non sono andate a buon fine' : '') + '.', 'ok');
            occupato(b, false);
            b.disabled = true;
            setTimeout(newsletter, 2200);
          });
        }

        return lotto();
      }).catch(function (e) {
        esito('#esito-nl', 'Invio interrotto: ' + e.message +
          ' — chi ha già ricevuto non riceverà due volte, puoi riprendere.', 'ko');
        occupato(b, false);
        $('#btn-salva').disabled = false;
        $('#btn-prova').disabled = false;
      });
    });
  }

  /* ============================================================
     STATISTICHE
     ============================================================ */

  function statistiche() {
    caricamento();
    var g = stato.periodo.giorni;
    var bucket = stato.periodo.bucket;
    var da = g === 1 ? giorniFa(0) : giorniFa(g - 1);
    var a = domani();

    Promise.all([
      rpc('stats_overview', { p_from: iso(da), p_to: iso(a) }),
      rpc('stats_timeseries', { p_from: iso(da), p_to: iso(a), p_bucket: bucket }),
      rpc('stats_pages', { p_from: iso(da), p_to: iso(a), p_limit: 25 }),
      rpc('stats_sources', { p_from: iso(da), p_to: iso(a) }),
      rpc('stats_contact_sources', { p_from: iso(da), p_to: iso(a) }),
      rpc('stats_funnel', { p_from: iso(da), p_to: iso(a) })
    ]).then(function (r) {
      var o = r[0], serie = r[1], pagine = r[2], fonti = r[3], fontiContatti = r[4], imbuto = r[5];

      var maxPagine = Math.max.apply(null, pagine.map(function (p) { return p.pageviews; }).concat([0]));
      var maxFonti = Math.max.apply(null, fonti.map(function (f) { return f.visits; }).concat([0]));
      var maxFC = Math.max.apply(null, fontiContatti.map(function (f) { return f.contacts; }).concat([0]));
      var maxImbuto = Math.max.apply(null, imbuto.map(function (e) { return e.sessions; }).concat([0]));

      $('#contenuto').innerHTML =
        intestazione('Statistiche', 'Visite e conversioni. Niente cookie, niente indirizzi IP.',
          '<div class="periodo">' +
            bottonePeriodo(7, 'day', '7 giorni') +
            bottonePeriodo(30, 'day', '30 giorni') +
            bottonePeriodo(90, 'week', '3 mesi') +
            bottonePeriodo(365, 'month', '12 mesi') +
          '</div>') +

        '<div class="griglia g4" style="margin-bottom:18px">' +
          riquadro('Visite', numero(o.visits), 'sessioni diverse') +
          riquadro('Pagine viste', numero(o.pageviews),
            o.visits ? (o.pageviews / o.visits).toFixed(1) + ' per visita' : '') +
          riquadro('Tempo medio', durata(o.avg_seconds), 'su una pagina') +
          riquadro('Email raccolte', numero(o.contacts), o.conversion + '% delle visite') +
        '</div>' +

        '<div class="scheda"><h2>Andamento</h2>' +
        '<p class="aiuto">' + (bucket === 'day' ? 'Per giorno' : bucket === 'week' ? 'Per settimana' : 'Per mese') + '.</p>' +
        grafico(seriePunti(serie, bucket)) + '</div>' +

        '<div class="griglia g2" style="margin-top:18px">' +
          '<div class="scheda"><h2>Pagine e sezioni più viste</h2>' +
          '<p class="aiuto">Il sito è una pagina sola: qui vedi le sezioni attraversate.</p>' +
          (pagine.length
            ? '<div class="tabella-avvolge"><table><thead><tr><th>Sezione</th>' +
              '<th class="num">Viste</th><th class="num">Tempo</th></tr></thead><tbody>' +
              pagine.map(function (p) {
                return misura('<b>' + esc(p.title || p.path) + '</b>' +
                  (p.title && p.title !== p.path ? '<div class="tenue mono" style="font-size:12px">' + esc(p.path) + '</div>' : ''),
                  p.pageviews, maxPagine, durata(p.avg_seconds));
              }).join('') + '</tbody></table></div>'
            : '<div class="vuoto">Nessuna visita in questo periodo.</div>') + '</div>' +

          '<div class="scheda"><h2>Da dove arrivano</h2>' +
          '<p class="aiuto">Motore di ricerca, social, link diretti.</p>' +
          (fonti.length
            ? '<div class="tabella-avvolge"><table><thead><tr><th>Provenienza</th>' +
              '<th class="num">Visite</th></tr></thead><tbody>' +
              fonti.map(function (f) { return misura(esc(f.source), f.visits, maxFonti); }).join('') +
              '</tbody></table></div>'
            : '<div class="vuoto">Nessun dato.</div>') + '</div>' +
        '</div>' +

        '<div class="griglia g2" style="margin-top:18px">' +
          '<div class="scheda"><h2>Dove lasciano l’email</h2>' +
          '<p class="aiuto">Quale punto del sito porta davvero contatti.</p>' +
          (fontiContatti.length
            ? '<div class="tabella-avvolge"><table><thead><tr><th>Punto del sito</th>' +
              '<th class="num">Email</th></tr></thead><tbody>' +
              fontiContatti.map(function (f) {
                return misura(esc(nomeFonte(f.source)), f.contacts, maxFC);
              }).join('') + '</tbody></table></div>'
            : '<div class="vuoto">Nessuna email in questo periodo.</div>') + '</div>' +

          '<div class="scheda"><h2>Cosa fanno sul sito</h2>' +
          '<p class="aiuto">Le azioni registrate, per numero di persone diverse.</p>' +
          (imbuto.length
            ? '<div class="tabella-avvolge"><table><thead><tr><th>Azione</th>' +
              '<th class="num">Persone</th><th class="num">Volte</th></tr></thead><tbody>' +
              imbuto.map(function (e) {
                return misura(esc(nomeEvento(e.name)), e.sessions, maxImbuto, numero(e.n));
              }).join('') + '</tbody></table></div>'
            : '<div class="vuoto">Nessuna azione registrata.</div>') + '</div>' +
        '</div>';

      Array.prototype.forEach.call(document.querySelectorAll('[data-periodo]'), function (b) {
        b.addEventListener('click', function () {
          var p = b.dataset.periodo.split(':');
          stato.periodo = { giorni: parseInt(p[0], 10), bucket: p[1] };
          statistiche();
        });
      });
    }).catch(mostraErrore);
  }

  function bottonePeriodo(giorni, bucket, etichetta) {
    var attivo = stato.periodo.giorni === giorni ? ' class="attivo"' : '';
    return '<button data-periodo="' + giorni + ':' + bucket + '"' + attivo + '>' + etichetta + '</button>';
  }

  /* ============================================================
     IMPOSTAZIONI
     ============================================================ */

  function impostazioni() {
    caricamento();
    server('settings.get').then(function (s) {
      stato.impostazioni = s;
      var smtp = s.smtp || {}, trello = s.trello || {}, sito = s.sito || {};

      $('#contenuto').innerHTML =
        intestazione('Impostazioni', 'Le password stanno sul server: qui vedi solo i pallini.') +

        /* ---------- SMTP ---------- */
        '<div class="scheda"><h2>Invio email (SMTP)</h2>' +
        '<p class="aiuto">Da qui partono le conferme di iscrizione, gli avvisi delle richieste ' +
        'e le newsletter.</p>' +
        '<div id="esito-smtp"></div>' +
        '<div class="avviso nota">Con Gmail serve una <b>password per le app</b>, non la password ' +
        'del tuo account: si crea in Account Google → Sicurezza → Verifica in due passaggi → ' +
        'Password per le app. Tieni presente che Gmail consegna al massimo ~500 email al giorno: ' +
        'oltre le 200–300 iscritti conviene passare a un servizio pensato per le newsletter.</div>' +

        '<div class="griglia g2">' +
          campo('smtp-host', 'Server', smtp.host || 'smtp.gmail.com') +
          campo('smtp-port', 'Porta', smtp.port || 465, 'number') +
          campo('smtp-user', 'Utente', smtp.user || '') +
          campo('smtp-pass', 'Password per le app', smtp.pass || '', 'password') +
          campo('smtp-from-name', 'Nome del mittente', smtp.from_name || 'Alberto Del Bove') +
          campo('smtp-from-email', 'Email del mittente', smtp.from_email || '') +
          campo('smtp-reply', 'Rispondi a', smtp.reply_to || '') +
          campo('smtp-batch', 'Email per lotto', smtp.batch || 25, 'number') +
        '</div>' +
        '<div class="riga-check"><input type="checkbox" id="smtp-secure"' +
          (smtp.secure !== false ? ' checked' : '') + '>' +
          '<label for="smtp-secure">Connessione cifrata (TLS) — lasciala accesa</label></div>' +
        '<div class="barra-azioni" style="margin-top:18px">' +
          '<button class="bottone" id="btn-salva-smtp">Salva</button>' +
          '<button class="bottone secondario" id="btn-prova-smtp">Mandami una prova</button>' +
        '</div></div>' +

        /* ---------- Trello ---------- */
        '<div class="scheda"><h2>Trello</h2>' +
        '<p class="aiuto">Quando arriva una richiesta di colloquio (o una nuova email), nasce da sola ' +
        'una scheda nella bacheca che scegli.</p>' +
        '<div id="esito-trello"></div>' +
        '<div class="avviso info">Chiave e token si prendono su ' +
        '<a href="https://trello.com/power-ups/admin" target="_blank" rel="noopener">trello.com/power-ups/admin</a>: ' +
        'crea un Power-Up, apri <b>API key</b>, copia la chiave e poi genera il token dal link «Token» ' +
        'accanto.</div>' +

        '<div class="griglia g2">' +
          campo('tr-key', 'Chiave API', trello.key || '', 'password') +
          campo('tr-token', 'Token', trello.token || '', 'password') +
        '</div>' +
        '<div class="barra-azioni" style="margin:16px 0">' +
          '<button class="bottone secondario" id="btn-salva-cred-trello">Salva credenziali</button>' +
          '<button class="bottone secondario" id="btn-carica-bacheche">Carica le bacheche</button>' +
        '</div>' +

        '<div class="griglia g3">' +
          '<div class="campo"><label for="tr-board">Bacheca</label>' +
            '<select id="tr-board"><option value="">—</option></select></div>' +
          '<div class="campo"><label for="tr-list">Lista per le richieste di colloquio</label>' +
            '<select id="tr-list"><option value="">—</option></select></div>' +
          '<div class="campo"><label for="tr-list-nl">Lista per le nuove email <span class="facolt">(facoltativa)</span></label>' +
            '<select id="tr-list-nl"><option value="">Nessuna scheda</option></select></div>' +
        '</div>' +
        '<div class="riga-check"><input type="checkbox" id="tr-attivo"' +
          (trello.attivo ? ' checked' : '') + '>' +
          '<label for="tr-attivo">Crea le schede automaticamente</label></div>' +
        '<div class="barra-azioni" style="margin-top:18px">' +
          '<button class="bottone" id="btn-salva-trello">Salva</button>' +
          '<button class="bottone secondario" id="btn-prova-trello">Prova il collegamento</button>' +
        '</div></div>' +

        /* ---------- Sito ---------- */
        '<div class="scheda"><h2>Il sito</h2>' +
        '<p class="aiuto">Compare nel piè di pagina delle email che partono da qui.</p>' +
        '<div id="esito-sito"></div>' +
        '<div class="griglia g2">' +
          campo('sito-url', 'Indirizzo', sito.url || 'https://www.albertodelbove-psicologo.it') +
          campo('sito-nome', 'Nome', sito.nome || 'Alberto Del Bove — Psicologo Psicoterapeuta') +
        '</div>' +
        '<div class="campo"><label for="sito-firma">Firma</label>' +
          '<input type="text" id="sito-firma" value="' + esc(sito.firma || '') +
          '" placeholder="Dott. Alberto Del Bove · Ordine Psicologi Lazio"></div>' +
        '<div class="barra-azioni" style="margin-top:18px">' +
          '<button class="bottone" id="btn-salva-sito">Salva</button></div></div>' +

        /* ---------- Importazione ---------- */
        '<div class="scheda"><h2>Importa contatti</h2>' +
        '<p class="aiuto">Per portare qui la lista che hai già su Brevo. Esporta il CSV da Brevo e ' +
        'incolla il contenuto, oppure scegli il file.</p>' +
        '<div id="esito-import"></div>' +
        '<div class="campo"><label for="imp-file">File CSV</label>' +
          '<input type="file" id="imp-file" accept=".csv,text/csv"></div>' +
        '<div class="campo"><label for="imp-testo">…oppure incolla qui (una email per riga, o CSV con intestazione)</label>' +
          '<textarea id="imp-testo" rows="7" placeholder="email,nome&#10;mario@esempio.it,Mario Rossi"></textarea></div>' +
        '<div class="riga-check"><input type="checkbox" id="imp-confermati" checked>' +
          '<label for="imp-confermati">Sono già confermati (venivano da una lista con double opt-in)</label></div>' +
        '<div class="barra-azioni" style="margin-top:18px">' +
          '<button class="bottone" id="btn-importa">Importa</button></div></div>' +

        /* ---------- Accesso ---------- */
        '<div class="scheda"><h2>Accesso al pannello</h2>' +
        '<p class="aiuto">Entri con <b>' + esc((sessione && sessione.email) || '') + '</b>. ' +
        'La password la cambi dal pannello di Supabase (Authentication → Users → i tre puntini → ' +
        'Reset password). Per dare accesso a qualcun altro, aggiungi la sua email alla tabella ' +
        '<span class="mono">admin_emails</span> e creagli un utente: senza entrambe le cose, ' +
        'chi entrasse non vedrebbe nemmeno una riga.</p></div>';

      /* ---- Eventi ---- */
      $('#btn-salva-smtp').addEventListener('click', salvaSmtp);
      $('#btn-prova-smtp').addEventListener('click', function () {
        var b = this;
        occupato(b, true, 'Invio…');
        salvaSmtp(true)
          .then(function () { return server('smtp.test'); })
          .then(function (d) { esito('#esito-smtp', d.messaggio, 'ok'); occupato(b, false); })
          .catch(function (e) { esito('#esito-smtp', e.message, 'ko'); occupato(b, false); });
      });

      $('#btn-salva-cred-trello').addEventListener('click', function () {
        salvaTrello(true).then(function () {
          esito('#esito-trello', 'Credenziali salvate. Ora puoi caricare le bacheche.', 'ok');
        });
      });
      $('#btn-carica-bacheche').addEventListener('click', caricaBacheche);
      $('#btn-salva-trello').addEventListener('click', function () {
        salvaTrello(false).then(function () { esito('#esito-trello', 'Impostazioni salvate.', 'ok'); });
      });
      $('#btn-prova-trello').addEventListener('click', function () {
        var b = this;
        occupato(b, true, 'Verifico…');
        salvaTrello(true)
          .then(function () { return server('trello.test'); })
          .then(function (d) { esito('#esito-trello', d.messaggio, 'ok'); occupato(b, false); })
          .catch(function (e) { esito('#esito-trello', e.message, 'ko'); occupato(b, false); });
      });

      $('#btn-salva-sito').addEventListener('click', function () {
        var b = this;
        occupato(b, true, 'Salvo…');
        server('settings.save', {
          sito: {
            url: $('#sito-url').value.trim(),
            nome: $('#sito-nome').value.trim(),
            firma: $('#sito-firma').value.trim()
          }
        }).then(function (s) {
          stato.impostazioni = s;
          esito('#esito-sito', 'Salvato.', 'ok');
          occupato(b, false);
        }).catch(function (e) { esito('#esito-sito', e.message, 'ko'); occupato(b, false); });
      });

      $('#imp-file').addEventListener('change', function () {
        var f = this.files[0];
        if (!f) { return; }
        var lettore = new FileReader();
        lettore.onload = function () { $('#imp-testo').value = lettore.result; };
        lettore.readAsText(f);
      });
      $('#btn-importa').addEventListener('click', importaContatti);

      // Se le bacheche erano già scelte, le ricarico per mostrare i nomi.
      if (trello.board_id) { caricaBacheche(trello); }
    }).catch(mostraErrore);
  }

  function campo(id, etichetta, valore, tipo) {
    return '<div class="campo"><label for="' + id + '">' + esc(etichetta) + '</label>' +
      '<input type="' + (tipo || 'text') + '" id="' + id + '" value="' + esc(valore) + '"></div>';
  }

  function salvaSmtp(silenzioso) {
    var b = silenzioso ? null : $('#btn-salva-smtp');
    occupato(b, true, 'Salvo…');
    return server('settings.save', {
      smtp: {
        host: $('#smtp-host').value.trim(),
        port: parseInt($('#smtp-port').value, 10) || 465,
        secure: $('#smtp-secure').checked,
        user: $('#smtp-user').value.trim(),
        pass: $('#smtp-pass').value,
        from_name: $('#smtp-from-name').value.trim(),
        from_email: $('#smtp-from-email').value.trim(),
        reply_to: $('#smtp-reply').value.trim(),
        batch: parseInt($('#smtp-batch').value, 10) || 25
      }
    }).then(function (s) {
      stato.impostazioni = s;
      // Rimetto la maschera: la password vera non torna mai indietro.
      $('#smtp-pass').value = s.smtp.pass || '';
      if (!silenzioso) { esito('#esito-smtp', 'Salvato.', 'ok'); }
      occupato(b, false);
      return s;
    }).catch(function (e) {
      esito('#esito-smtp', e.message, 'ko');
      occupato(b, false);
      throw e;
    });
  }

  function salvaTrello(soloCredenziali) {
    return server('settings.save', {
      trello: {
        key: $('#tr-key').value,
        token: $('#tr-token').value,
        board_id: $('#tr-board').value,
        list_id: $('#tr-list').value,
        list_id_newsletter: $('#tr-list-nl').value,
        attivo: soloCredenziali ? undefined : $('#tr-attivo').checked
      }
    }).then(function (s) {
      stato.impostazioni = s;
      $('#tr-key').value = s.trello.key || '';
      $('#tr-token').value = s.trello.token || '';
      return s;
    }).catch(function (e) {
      esito('#esito-trello', e.message, 'ko');
      throw e;
    });
  }

  function caricaBacheche(precedenti) {
    var b = $('#btn-carica-bacheche');
    occupato(b, true, 'Carico…');
    var salvate = precedenti && precedenti.board_id
      ? precedenti
      : (stato.impostazioni && stato.impostazioni.trello) || {};

    server('trello.boards').then(function (d) {
      var sel = $('#tr-board');
      sel.innerHTML = '<option value="">—</option>' + d.bacheche.map(function (bo) {
        return '<option value="' + esc(bo.id) + '"' +
          (bo.id === salvate.board_id ? ' selected' : '') + '>' + esc(bo.name) + '</option>';
      }).join('');

      sel.onchange = function () { caricaListe(sel.value, salvate); };
      occupato(b, false);
      if (sel.value) { caricaListe(sel.value, salvate); }
      else { esito('#esito-trello', 'Bacheche caricate: scegline una.', 'ok'); }
    }).catch(function (e) { esito('#esito-trello', e.message, 'ko'); occupato(b, false); });
  }

  function caricaListe(boardId, salvate) {
    if (!boardId) { return; }
    server('trello.lists', { board_id: boardId }).then(function (d) {
      [['#tr-list', 'list_id', '—'], ['#tr-list-nl', 'list_id_newsletter', 'Nessuna scheda']]
        .forEach(function (par) {
          var sel = $(par[0]);
          sel.innerHTML = '<option value="">' + par[2] + '</option>' + d.liste.map(function (l) {
            return '<option value="' + esc(l.id) + '"' +
              (l.id === salvate[par[1]] ? ' selected' : '') + '>' + esc(l.name) + '</option>';
          }).join('');
        });
    }).catch(function (e) { esito('#esito-trello', e.message, 'ko'); });
  }

  /**
   * Legge sia un CSV con intestazione sia un semplice elenco di email.
   * Non pretendo un formato: cerco la colonna che somiglia a un'email.
   */
  function analizzaImportazione(testo) {
    var righe = testo.split(/\r?\n/).map(function (r) { return r.trim(); }).filter(Boolean);
    if (!righe.length) { return []; }

    var separatore = righe[0].indexOf(';') > -1 && righe[0].indexOf(',') === -1 ? ';' : ',';
    var testata = righe[0].toLowerCase();
    var haTestata = /email|e-mail|indirizzo/.test(testata) && !/@/.test(righe[0]);

    var colEmail = 0, colNome = -1;
    if (haTestata) {
      var colonne = testata.split(separatore).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
      colonne.forEach(function (c, i) {
        if (/email|e-mail|indirizzo/.test(c)) { colEmail = i; }
        if (/nome|name|prenome|firstname/.test(c)) { colNome = i; }
      });
      righe.shift();
    }

    return righe.map(function (r) {
      var celle = r.split(separatore).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
      // Se non c'è intestazione, prendo la prima cella che contiene una @.
      var email = haTestata ? celle[colEmail] : celle.filter(function (c) { return c.indexOf('@') > 0; })[0];
      return { email: email || '', name: colNome >= 0 ? celle[colNome] : '' };
    }).filter(function (c) { return c.email; });
  }

  function importaContatti() {
    var b = $('#btn-importa');
    var righe = analizzaImportazione($('#imp-testo').value);

    if (!righe.length) {
      esito('#esito-import', 'Non ho trovato nessuna email in quel testo.', 'ko');
      return;
    }
    if (!confirm('Importare ' + righe.length + ' contatti?')) { return; }

    var confermati = $('#imp-confermati').checked;
    occupato(b, true, 'Importo…');

    server('contacts.import', {
      contacts: righe.map(function (r) {
        return { email: r.email, name: r.name, source: 'import', status: confermati ? 'confirmed' : 'pending' };
      })
    }).then(function (d) {
      esito('#esito-import', d.nuovi + ' nuovi, ' + d.aggiornati + ' già presenti aggiornati' +
        (d.scartati ? ', ' + d.scartati + ' righe scartate perché non erano email valide' : '') + '.', 'ok');
      $('#imp-testo').value = '';
      occupato(b, false);
    }).catch(function (e) { esito('#esito-import', e.message, 'ko'); occupato(b, false); });
  }

  /* ============================================================
     Cassetto laterale
     ============================================================ */

  function apriCassetto(titolo, html) {
    $('#cassetto').innerHTML =
      '<div class="velo"><div class="cassetto">' +
      '<div class="cassetto-testata"><h2>' + esc(titolo) + '</h2>' +
      '<button class="chiudi" aria-label="Chiudi">✕</button></div>' + html + '</div></div>';
    document.body.style.overflow = 'hidden';
  }

  function chiudiCassetto() {
    $('#cassetto').innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ============================================================
     Errori
     ============================================================ */

  function mostraErrore(e) {
    var messaggio = (e && e.message) || 'Qualcosa non ha funzionato.';
    // Se il token non vale più, l'unica cosa sensata è rifare il login.
    if (/JWT|token|autenticat/i.test(messaggio)) {
      salvaSessione(null);
      location.reload();
      return;
    }
    $('#contenuto').innerHTML =
      intestazione('Ops') +
      '<div class="avviso ko">' + esc(messaggio) + '</div>' +
      '<button class="bottone secondario" onclick="location.reload()">Ricarica</button>';
  }

  /* ============================================================
     Avvio
     ============================================================ */

  function risolviUtente(inserito) {
    var v = String(inserito || '').trim();
    if (v.indexOf('@') > 0) { return v; }
    var alias = CONFIG.alias[v.toLowerCase()];
    if (alias) { return alias; }
    return null;
  }

  function avviaPannello() {
    $('#accesso').classList.add('nascosto');
    $('#app').classList.remove('nascosto');
    $('#chi-sono').textContent = sessione.email;

    // Le impostazioni servono al cruscotto per avvisare se manca l'SMTP.
    server('settings.get')
      .then(function (s) { stato.impostazioni = s; })
      .catch(function () { /* il cruscotto funziona lo stesso */ })
      .then(function () {
        var iniziale = (location.hash || '').replace('#', '') || 'cruscotto';
        vai(['cruscotto', 'contatti', 'richieste', 'newsletter', 'statistiche', 'impostazioni']
          .indexOf(iniziale) >= 0 ? iniziale : 'cruscotto');
      });
  }

  function init() {
    /* --- Accesso --- */
    $('#form-accesso').addEventListener('submit', function (e) {
      e.preventDefault();
      var b = $('#btn-accedi');
      var utente = risolviUtente($('#utente').value);

      if (!utente) {
        esito('#esito-accesso', 'Scrivi la tua email per intero.', 'ko');
        return;
      }

      occupato(b, true, 'Verifico…');
      accedi(utente, $('#password').value, $('#ricordami').checked)
        .then(avviaPannello)
        .catch(function (err) {
          // Non distinguo "utente inesistente" da "password sbagliata":
          // dirlo aiuterebbe solo chi prova a indovinare.
          esito('#esito-accesso',
            /Invalid|credential/i.test(err.message)
              ? 'Nome utente o password non corretti.'
              : err.message, 'ko');
          occupato(b, false);
          $('#password').value = '';
        });
    });

    $('#btn-esci').addEventListener('click', esci);

    /* --- Navigazione --- */
    Array.prototype.forEach.call(document.querySelectorAll('.voce'), function (v) {
      v.addEventListener('click', function () { vai(v.dataset.sezione); });
    });

    /* --- Click delegati: righe delle tabelle e cassetto --- */
    document.addEventListener('click', function (e) {
      var el;

      if ((el = e.target.closest('[data-contatto]'))) { schedaContatto(el.dataset.contatto); return; }
      if ((el = e.target.closest('[data-richiesta]'))) { schedaRichiesta(el.dataset.richiesta); return; }
      if ((el = e.target.closest('[data-newsletter]'))) { editorNewsletter(el.dataset.newsletter); return; }
      if ((el = e.target.closest('[data-elimina]'))) { eliminaContatto(el.dataset.elimina); return; }
      if (e.target.closest('.chiudi') || e.target.classList.contains('velo')) { chiudiCassetto(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { chiudiCassetto(); }
    });

    /* --- C'è già una sessione? --- */
    caricaSessione();
    if (sessione) {
      conToken().then(avviaPannello).catch(function () {
        salvaSessione(null);
        $('#utente').focus();
      });
    } else {
      $('#utente').focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
