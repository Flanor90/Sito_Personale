/* ============================================================
   consenso.js — consenso ai cookie di Google (statistiche e campagne)
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Il sito ha sempre avuto statistiche proprie senza cookie e senza
   indirizzi IP, e la pagina privacy lo dichiara. Gli strumenti di Google
   invece i cookie li scrivono, e trattano l'IP: non si possono caricare
   e basta, né lasciando in pagina una frase diventata falsa.

   Due finalità, due consensi distinti:
   - statistiche: Google Analytics 4, per capire da dove arriva chi legge;
   - campagne: Google Ads, solo per contare quante persone, arrivate da
     un annuncio, poi scrivono su WhatsApp. Niente remarketing, niente
     annunci personalizzati (ad_personalization resta sempre negato).

   La regola resta la più prudente: finché il visitatore non ha detto di
   sì ad almeno una delle due, gtag.js NON viene scaricato, perché anche
   la sola richiesta ai server di Google porta con sé l'indirizzo IP.

   «Rifiuto» e «Accetto» hanno lo stesso peso grafico, chiudere non vale
   come accettare, e «Scelgo io» permette di dire sì a una sola delle due:
   il Garante chiede proprio questa granularità.

   Chi cambia idea trova «Preferenze cookie» nel piè di pagina.
   ============================================================ */
(function () {
  'use strict';

  var CHIAVE_STAT = 'consensoStatistiche';  // 'si' | 'no'
  var CHIAVE_ADS = 'consensoAnnunci';       // 'si' | 'no' — dal 20/10/2026
  var GA_ID = 'G-GV4Z7PRELC';
  var ADS_ID = 'AW-18317931670';
  // Conversione «Clic WhatsApp» configurata in Google Ads.
  var ADS_CONVERSIONE_WHATSAPP = 'AW-18317931670/VJtCCOqtjqMdEJbp1Z5E';

  var TESTI = {
    it: {
      testo: 'Uso un contatore anonimo. Con il tuo permesso aggiungo due strumenti di Google che usano cookie: Analytics (come arrivi qui) e la misura delle campagne (se un annuncio ti ha portato a scrivermi). Niente annunci personalizzati.',
      si: 'Accetto',
      no: 'Rifiuto',
      scegli: 'Scelgo io',
      salva: 'Salva le scelte',
      stat: 'Statistiche (Google Analytics)',
      ads: 'Misura delle campagne (Google Ads)',
      info: 'Informativa'
    },
    en: {
      testo: 'I use an anonymous counter. With your permission I add two Google tools that use cookies: Analytics (how you got here) and campaign measurement (whether an ad led you to write to me). No personalised ads.',
      si: 'Accept',
      no: 'Decline',
      scegli: 'Let me choose',
      salva: 'Save choices',
      stat: 'Statistics (Google Analytics)',
      ads: 'Campaign measurement (Google Ads)',
      info: 'Privacy notice'
    },
    es: {
      testo: 'Uso un contador anónimo. Con tu permiso añado dos herramientas de Google que usan cookies: Analytics (cómo has llegado aquí) y la medición de campañas (si un anuncio te ha llevado a escribirme). Sin anuncios personalizados.',
      si: 'Acepto',
      no: 'Rechazo',
      scegli: 'Elijo yo',
      salva: 'Guardar',
      stat: 'Estadísticas (Google Analytics)',
      ads: 'Medición de campañas (Google Ads)',
      info: 'Información'
    }
  };

  function lingua() {
    var l = (window.SiteI18N && window.SiteI18N.lang) ||
            (document.documentElement.getAttribute('lang') || 'it').slice(0, 2);
    return TESTI[l] ? l : 'it';
  }

  function leggi(chiave) {
    try { return localStorage.getItem(chiave); } catch (e) { return null; }
  }

  function scrivi(chiave, valore) {
    try { localStorage.setItem(chiave, valore); } catch (e) { /* niente */ }
  }

  function stato() {
    return { stat: leggi(CHIAVE_STAT) === 'si', ads: leggi(CHIAVE_ADS) === 'si' };
  }

  /* ----------------------------------------------------------
     Google — solo su consenso esplicito, per la finalità scelta.
     ---------------------------------------------------------- */
  function permessi(s) {
    return {
      analytics_storage: s.stat ? 'granted' : 'denied',
      ad_storage: s.ads ? 'granted' : 'denied',
      ad_user_data: s.ads ? 'granted' : 'denied',
      ad_personalization: 'denied'
    };
  }

  function applica(s) {
    if (!s.stat && !s.ads) {
      // Revoca a metà visita: se Google era già partito, lo spengo.
      if (window.__googleAvviato) { window.gtag('consent', 'update', permessi(s)); }
      return;
    }
    if (window.__googleAvviato) {
      window.gtag('consent', 'update', permessi(s));
      if (s.stat && !window.__gaConfigurato) { window.gtag('config', GA_ID, { anonymize_ip: true }); window.__gaConfigurato = true; }
      if (s.ads && !window.__adsConfigurato) { window.gtag('config', ADS_ID); window.__adsConfigurato = true; }
      return;
    }
    window.__googleAvviato = true;

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('consent', 'default', permessi(s));
    gtag('js', new Date());
    if (s.stat) { gtag('config', GA_ID, { anonymize_ip: true }); window.__gaConfigurato = true; }
    if (s.ads) { gtag('config', ADS_ID); window.__adsConfigurato = true; }

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + (s.stat ? GA_ID : ADS_ID);
    document.head.appendChild(script);
  }

  /* Conversione Google Ads: un clic verso WhatsApp. Conta solo se la
     misura delle campagne è stata accettata; altrimenti non parte nulla.
     I link a WhatsApp si aprono in una nuova scheda, quindi non serve il
     rinvio della pagina dello snippet di Google: basta il beacon. */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('a[href*="wa.me/"], #whatsapp-send');
    if (!el || !stato().ads || typeof window.gtag !== 'function') { return; }
    window.gtag('event', 'conversion', {
      send_to: ADS_CONVERSIONE_WHATSAPP,
      value: 1.0,
      currency: 'EUR',
      transport_type: 'beacon'
    });
  }, true);

  /* Conversione Google Ads: una richiesta di primo colloquio arrivata
     davvero (il server ha risposto ok). In Ads è l'azione «Invio modulo
     per i lead», importata da GA4: per questo l'evento parte con il nome
     che GA4 si aspetta, e solo se le statistiche sono state accettate.
     generate_lead è l'evento standard di GA4 per lo stesso fatto. */
  function conversioneModulo() {
    var s = stato();
    if (!(s.stat || s.ads) || typeof window.gtag !== 'function') { return; }
    window.gtag('event', 'ads_conversion_Invio_modulo_per_i_lead_1');
    window.gtag('event', 'generate_lead', { value: 1.0, currency: 'EUR' });
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

  function decidi(banner, s) {
    scrivi(CHIAVE_STAT, s.stat ? 'si' : 'no');
    scrivi(CHIAVE_ADS, s.ads ? 'si' : 'no');
    applica(s);
    chiudi(banner);
  }

  function mostraBanner() {
    if (document.getElementById('banner-consenso')) { return; }
    var t = TESTI[lingua()];
    var attuale = stato();
    var pulsante = 'text-sm font-semibold px-4 py-2 rounded-full transition-colors ';

    var banner = document.createElement('div');
    banner.id = 'banner-consenso';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', t.info);
    banner.className = 'fixed inset-x-0 bottom-0 z-[60] p-4 transition-all duration-200';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(0.5rem)';

    banner.innerHTML =
      '<div class="max-w-3xl mx-auto bg-notte text-crema rounded-2xl shadow-xl px-5 py-4">' +
        '<div class="flex flex-col sm:flex-row sm:items-center gap-4">' +
          '<p class="text-sm leading-relaxed grow">' + t.testo +
            ' <a href="/privacy/" class="underline hover:text-white">' + t.info + '</a>' +
          '</p>' +
          '<div class="flex flex-wrap items-center gap-2 flex-none">' +
            '<button type="button" data-scelta="scegli" class="' + pulsante + 'text-crema/80 underline underline-offset-4 hover:text-white">' + t.scegli + '</button>' +
            '<button type="button" data-scelta="no" class="' + pulsante + 'border border-crema/40 text-crema hover:bg-white/10">' + t.no + '</button>' +
            '<button type="button" data-scelta="si" class="' + pulsante + 'border border-transparent bg-mirtillo-600 text-white hover:bg-mirtillo-500">' + t.si + '</button>' +
          '</div>' +
        '</div>' +
        '<div data-pannello hidden class="mt-4 pt-4 border-t border-crema/15">' +
          '<label class="flex items-center gap-3 text-sm py-1.5 cursor-pointer">' +
            '<input type="checkbox" data-finalita="stat" class="h-4 w-4 rounded"' + (attuale.stat ? ' checked' : '') + '> ' + t.stat +
          '</label>' +
          '<label class="flex items-center gap-3 text-sm py-1.5 cursor-pointer">' +
            '<input type="checkbox" data-finalita="ads" class="h-4 w-4 rounded"' + (attuale.ads ? ' checked' : '') + '> ' + t.ads +
          '</label>' +
          '<button type="button" data-scelta="salva" class="' + pulsante + 'mt-3 bg-crema text-notte hover:bg-white">' + t.salva + '</button>' +
        '</div>' +
      '</div>';

    banner.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button[data-scelta]') : null;
      if (!b) { return; }
      var scelta = b.getAttribute('data-scelta');
      if (scelta === 'scegli') {
        var pannello = banner.querySelector('[data-pannello]');
        pannello.hidden = !pannello.hidden;
        return;
      }
      if (scelta === 'si') { decidi(banner, { stat: true, ads: true }); return; }
      if (scelta === 'no') { decidi(banner, { stat: false, ads: false }); return; }
      if (scelta === 'salva') {
        decidi(banner, {
          stat: banner.querySelector('[data-finalita="stat"]').checked,
          ads: banner.querySelector('[data-finalita="ads"]').checked
        });
      }
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
    // Chi aveva già scelto sulle statistiche prima che esistesse la misura
    // delle campagne rivede il banner una volta: è una finalità nuova, e il
    // sì di allora non la copriva. Intanto vale quello che aveva deciso.
    var s = stato();
    if (s.stat || s.ads) { applica(s); }
    if (leggi(CHIAVE_STAT) === null || leggi(CHIAVE_ADS) === null) { mostraBanner(); }
  }

  // Per il link «Preferenze cookie» nel piè di pagina.
  window.ConsensoCookie = {
    apri: mostraBanner,
    stato: stato,
    conversioneModulo: conversioneModulo
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
