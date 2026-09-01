/* ============================================================
   consenso.js — consenso ai cookie statistici (Google Analytics)
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Il sito ha sempre avuto statistiche proprie senza cookie e senza
   indirizzi IP, e la pagina privacy lo dichiara. Google Analytics
   invece i cookie li scrive, e tratta l'IP: non si può caricare e
   basta, né lasciando in pagina una frase diventata falsa.

   Qui la regola è una sola, ed è la più prudente fra quelle possibili:
   finché il visitatore non ha detto di sì, gtag.js NON viene scaricato.
   Non è solo questione di cookie — è che senza consenso il browser non
   deve nemmeno contattare i server di Google, perché quella richiesta
   porta con sé l'indirizzo IP.

   Le due scelte hanno lo stesso peso grafico, e chiudere il banner non
   equivale ad accettare: si può solo scegliere. Il Garante contesta
   proprio i banner in cui rifiutare costa più fatica che accettare.

   Chi cambia idea trova «Preferenze cookie» nel piè di pagina.
   ============================================================ */
(function () {
  'use strict';

  var CHIAVE = 'consensoStatistiche';   // 'si' | 'no'
  var GA_ID = 'G-GV4Z7PRELC';

  var TESTI = {
    it: {
      testo: 'Uso un contatore statistico anonimo, e vorrei aggiungere Google Analytics per capire come arrivi qui. Scrive cookie: lo attivo solo se me lo permetti.',
      si: 'Accetto',
      no: 'Rifiuto',
      info: 'Informativa'
    },
    en: {
      testo: 'This site uses an anonymous counter. I would also like to use Google Analytics to see how you got here. It writes cookies, so I only enable it if you agree.',
      si: 'Accept',
      no: 'Decline',
      info: 'Privacy notice'
    },
    es: {
      testo: 'Uso un contador estadístico anónimo y me gustaría añadir Google Analytics para saber cómo has llegado aquí. Usa cookies: solo lo activo si me lo permites.',
      si: 'Acepto',
      no: 'Rechazo',
      info: 'Información'
    }
  };

  function lingua() {
    var l = (window.SiteI18N && window.SiteI18N.lang) ||
            (document.documentElement.getAttribute('lang') || 'it').slice(0, 2);
    return TESTI[l] ? l : 'it';
  }

  function leggi() {
    try { return localStorage.getItem(CHIAVE); } catch (e) { return null; }
  }

  function scrivi(valore) {
    try { localStorage.setItem(CHIAVE, valore); } catch (e) { /* niente */ }
  }

  /* ----------------------------------------------------------
     Avvio di Google Analytics — solo su consenso esplicito.
     ---------------------------------------------------------- */
  function avviaAnalytics() {
    if (window.__analyticsAvviato) { return; }
    window.__analyticsAvviato = true;

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    /* Consent Mode: le statistiche sì (le ha appena concesse), la
       pubblicità no — non la faccio, e non voglio che i dati finiscano
       in profilazione pubblicitaria. */
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });

    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  /* ----------------------------------------------------------
     Il banner
     ---------------------------------------------------------- */
  function chiudi(banner) {
    document.body.classList.remove('con-banner-consenso');
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(0.5rem)';
    setTimeout(function () { banner.remove(); }, 200);
  }

  function mostraBanner() {
    if (document.getElementById('banner-consenso')) { return; }
    var t = TESTI[lingua()];

    var banner = document.createElement('div');
    banner.id = 'banner-consenso';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', t.info);
    banner.className = 'fixed inset-x-0 bottom-0 z-[60] p-4 transition-all duration-200';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(0.5rem)';

    banner.innerHTML =
      '<div class="max-w-3xl mx-auto bg-notte text-crema rounded-2xl shadow-xl ' +
      'px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">' +
        '<p class="text-sm leading-relaxed grow">' + t.testo +
          ' <a href="/privacy/" class="underline hover:text-white">' + t.info + '</a>' +
        '</p>' +
        '<div class="flex items-center gap-2 flex-none">' +
          '<button type="button" data-scelta="no" ' +
            'class="text-sm font-semibold border border-crema/40 text-crema px-4 py-2 rounded-full ' +
            'hover:bg-white/10 transition-colors">' + t.no + '</button>' +
          '<button type="button" data-scelta="si" ' +
            'class="text-sm font-semibold bg-mirtillo-600 text-white px-4 py-2 rounded-full ' +
            'hover:bg-mirtillo-500 transition-colors">' + t.si + '</button>' +
        '</div>' +
      '</div>';

    banner.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button[data-scelta]') : null;
      if (!b) { return; }
      var scelta = b.getAttribute('data-scelta');
      scrivi(scelta);
      if (scelta === 'si') { avviaAnalytics(); }
      chiudi(banner);
    });

    document.body.appendChild(banner);
    // La barra contatti su mobile vive nello stesso angolo: le tolgo di
    // mezzo finché c'è il banner, così la scelta resta leggibile.
    document.body.classList.add('con-banner-consenso');

    setTimeout(function () {
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
    }, 30);
  }

  function avvia() {
    var scelta = leggi();
    if (scelta === 'si') { avviaAnalytics(); return; }
    if (scelta === 'no') { return; }
    mostraBanner();
  }

  // Per il link «Preferenze cookie» nel piè di pagina.
  window.ConsensoCookie = {
    apri: mostraBanner,
    stato: leggi
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
