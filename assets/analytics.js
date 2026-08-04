/* ============================================================
   analytics.js — misurare senza sorvegliare
   ------------------------------------------------------------
   Un sito di psicoterapia raccoglie, per forza di cose, la traccia di
   persone che stanno cercando aiuto. Misurare serve — sapere quale
   pagina porta contatti è ciò che permette di migliorarla — ma il modo
   in cui si misura non è indifferente.

   Cosa NON viene raccolto, per scelta:
   • nessun cookie;
   • nessun indirizzo IP (il server ne usa un'impronta giornaliera solo
     per fermare i bot, e non la salva);
   • nessun identificativo che sopravviva alla chiusura della scheda;
   • nessuna risposta ai test, mai.

   Cosa viene raccolto: quali sezioni vengono viste, per quanto tempo,
   da quale sito si arriva, e le azioni che contano (test iniziato,
   email lasciata, richiesta inviata).

   Il session_id è un numero casuale che vive in sessionStorage: serve a
   non contare dieci volte la stessa visita, e sparisce quando la scheda
   si chiude. Non permette di riconoscere nessuno il giorno dopo.

   Perché questo importa in pratica: senza cookie e senza dati che
   identificano una persona, il tracciamento non richiede il banner dei
   cookie — e il sito resta pulito.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SiteAnalytics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONFIG = {
    endpoint: 'https://ynmxgdcikqlgcupfszza.supabase.co/functions/v1/api/track',
    // Ogni quanto svuotare la coda, in millisecondi. Raggruppare gli
    // eventi tiene basso il numero di richieste (e di conseguenza
    // il consumo del piano gratuito) senza perdere nulla.
    attesa: 4000
  };

  /* ---------- Funzioni pure (testabili in Node) ---------- */

  /** Categoria grossolana del dispositivo, dalla larghezza dello schermo. */
  function dispositivo(larghezza) {
    if (!larghezza) { return null; }
    if (larghezza < 640) { return 'mobile'; }
    if (larghezza < 1024) { return 'tablet'; }
    return 'desktop';
  }

  /**
   * La larghezza da usare per classificare il dispositivo.
   *
   * innerWidth da solo non basta: in una scheda aperta in secondo piano,
   * durante il precaricamento di una pagina, e in certi browser incorporati
   * nelle app (Instagram, Facebook) vale 0. Prendendo il primo valore
   * sensato fra i tre, il dato non si perde più in silenzio.
   */
  function larghezzaUtile(finestra) {
    var w = finestra || {};
    var doc = w.document && w.document.documentElement;
    return w.innerWidth ||
           (doc && doc.clientWidth) ||
           (w.screen && w.screen.width) ||
           0;
  }

  /**
   * Nome del browser dallo user agent. Volutamente approssimativo:
   * mi interessa sapere se un layout si rompe su Safari, non costruire
   * un'impronta digitale del visitatore.
   */
  function browser(ua) {
    ua = String(ua || '');
    if (/Edg\//.test(ua)) { return 'Edge'; }
    if (/OPR\/|Opera/.test(ua)) { return 'Opera'; }
    if (/Chrome\//.test(ua)) { return 'Chrome'; }
    if (/Firefox\//.test(ua)) { return 'Firefox'; }
    if (/Safari\//.test(ua)) { return 'Safari'; }
    return 'Altro';
  }

  /** Il paese dalla lingua del browser: "it-IT" → "IT". Nessuna geolocalizzazione. */
  function paese(locale) {
    var m = String(locale || '').match(/[-_]([A-Za-z]{2})$/);
    return m ? m[1].toUpperCase() : null;
  }

  /** Legge i parametri di campagna dall'indirizzo. */
  function campagna(ricerca) {
    var p = new URLSearchParams(String(ricerca || ''));
    return {
      utm_source: p.get('utm_source') || null,
      utm_medium: p.get('utm_medium') || null,
      utm_campaign: p.get('utm_campaign') || null
    };
  }

  /**
   * Il percorso da registrare. Finché il sito è una pagina sola, le
   * sezioni raggiunte con #ancora contano come pagine a sé: altrimenti
   * ogni visita risulterebbe "/" e non si capirebbe più niente.
   * Quando le sezioni diventeranno indirizzi veri (/newsletter, /test…)
   * questa funzione continuerà a fare la cosa giusta senza modifiche.
   */
  function percorso(pathname, hash) {
    var p = String(pathname || '/');
    var h = String(hash || '').replace(/^#/, '').split('?')[0];
    if (!h) { return p; }
    if (p !== '/' && p !== '') { return p; }
    return '/' + h;
  }

  /* ---------- Parte browser ---------- */

  var haDOM = typeof document !== 'undefined' && typeof window !== 'undefined';

  var sessione = null;
  var coda = { views: [], events: [] };
  var timer = null;
  var vistaCorrente = null;
  var apertaAlle = 0;

  function idSessione() {
    if (sessione) { return sessione; }
    try {
      sessione = sessionStorage.getItem('adb-sessione');
      if (!sessione) {
        // Casuale e senza legame con la persona: solo per non contare due
        // volte la stessa visita.
        var b = new Uint8Array(12);
        crypto.getRandomValues(b);
        sessione = Array.prototype.map.call(b, function (x) {
          return x.toString(16).padStart(2, '0');
        }).join('');
        sessionStorage.setItem('adb-sessione', sessione);
      }
    } catch (e) {
      // Navigazione privata con storage bloccato: uso un id volatile.
      sessione = 'volatile-' + Math.random().toString(16).slice(2);
    }
    return sessione;
  }

  /** Se non c'è niente da mandare, non manda niente. */
  function svuota(finale) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!coda.views.length && !coda.events.length) { return; }

    var carico = JSON.stringify({
      session: idSessione(),
      views: coda.views,
      events: coda.events
    });
    coda = { views: [], events: [] };

    // Alla chiusura della pagina fetch viene ucciso a metà: sendBeacon è
    // l'unico modo affidabile di far uscire l'ultimo pacchetto.
    if (finale && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(CONFIG.endpoint, new Blob([carico], { type: 'text/plain' }));
        return;
      } catch (e) { /* ricado su fetch */ }
    }

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: carico,
      keepalive: true
      // Un errore qui non deve disturbare nessuno: le statistiche sono
      // la cosa meno importante che succede su questa pagina.
    }).catch(function () {});
  }

  function programma() {
    if (timer) { return; }
    timer = setTimeout(function () { svuota(false); }, CONFIG.attesa);
  }

  /** Chiude la vista in corso registrando quanto è durata. */
  function chiudiVista() {
    if (!vistaCorrente) { return; }
    vistaCorrente.seconds = Math.round((Date.now() - apertaAlle) / 1000);
    coda.views.push(vistaCorrente);
    vistaCorrente = null;
  }

  /** Registra una nuova vista (pagina o sezione). */
  function vista(percorsoEsplicito, titolo) {
    if (!haDOM) { return; }
    chiudiVista();

    var utm = campagna(location.search);
    vistaCorrente = {
      path: percorsoEsplicito || percorso(location.pathname, location.hash),
      title: titolo || document.title,
      // Il referrer serve solo la prima volta: dopo, sarebbe il sito stesso.
      referrer: coda.views.length === 0 ? document.referrer : '',
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      lang: (window.SiteI18N && window.SiteI18N.lang) || document.documentElement.lang || 'it',
      country: paese(navigator.language),
      device: dispositivo(larghezzaUtile(window)),
      browser: browser(navigator.userAgent)
    };
    apertaAlle = Date.now();
    programma();
  }

  /**
   * Registra un'azione. `props` deve contenere solo informazioni sul
   * sito (quale test, quale compendio), mai sulla persona.
   */
  function evento(nome, props) {
    if (!haDOM || !nome) { return; }
    coda.events.push({
      name: String(nome).slice(0, 60),
      path: percorso(location.pathname, location.hash),
      props: props || {}
    });
    programma();
  }

  /* ---------- Cablaggio automatico ---------- */

  function avvia() {
    vista();

    // Cambio di sezione = nuova vista.
    window.addEventListener('hashchange', function () { vista(); });

    // Uscita dalla pagina: chiudo la vista e mando tutto.
    window.addEventListener('pagehide', function () { chiudiVista(); svuota(true); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { chiudiVista(); svuota(true); }
      else if (!vistaCorrente) { vista(); }
    });

    // Click sulle chiamate all'azione, riconosciute dall'attributo.
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-evento]');
      if (el) { evento(el.dataset.evento, { etichetta: el.dataset.eventoEtichetta || null }); }
    });
  }

  if (haDOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', avvia);
    } else {
      avvia();
    }
  }

  return {
    CONFIG: CONFIG,
    vista: vista,
    evento: evento,
    svuota: svuota,
    // Esposte per i test automatici
    dispositivo: dispositivo,
    larghezzaUtile: larghezzaUtile,
    browser: browser,
    paese: paese,
    campagna: campagna,
    percorso: percorso
  };
});
