/* ============================================================
   newsletter.js — raccolta email (newsletter, compendi, test)
   ------------------------------------------------------------
   Il sito è statico (GitHub Pages): non esiste un backend. Le
   iscrizioni vengono inviate a Brevo (ex-Sendinblue), azienda UE
   adatta al GDPR, tramite il suo modulo ospitato ("serve" URL).
   L'invio avviene con un POST verso un <iframe> nascosto: nessuna
   chiamata XHR cross-origin, nessuna API key esposta nel browser.

   Con il double opt-in di Brevo, chi si iscrive riceve una email di
   conferma: è quella la vera prova dell'iscrizione. Per questo, dopo
   l'invio, mostriamo sempre "controlla la tua email per confermare".

   IMPORTANTE — privacy dei test: le RISPOSTE dei test non lasciano
   mai il browser. Qui viaggia solo l'indirizzo email che la persona
   sceglie volontariamente di lasciare, insieme alla fonte (FONTE) da
   cui arriva, così finisce nella mailing giusta.

   Il file è in stile UMD come quiz-core.js: le funzioni pure girano
   anche in Node (per i test automatici); il cablaggio del DOM parte
   solo nel browser.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SiteNewsletter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
     >>> CONFIGURAZIONE — L'UNICA PARTE DA COMPILARE <<<
     Vedi NEWSLETTER-SETUP.md per la guida passo-passo.
     ============================================================ */
  var CONFIG = {
    // URL "serve" del/dei modulo/i Brevo (es. https://sibforms.com/serve/MUIF...).
    // Basta UN endpoint in `default`: la fonte viene salvata nell'attributo FONTE
    // e puoi segmentare le campagne da lì. Se preferisci liste separate, crea più
    // moduli Brevo e incolla un URL per ciascuna fonte (test/newsletter/compendi…).
    // Modulo "Sito terapeuta - iscrizione newsletter" (Brevo, account Psicovoice):
    // double opt-in attivo, lista "Sito terapeuta – Newsletter", campi EMAIL/NOME/FONTE.
    endpoints: {
      default:    'https://e83a58bc.sibforms.com/serve/MUIFAAeBN6JyNfxfOlAcWXBLyK_9T4KFOppmy7AzJlyYzoUaSLmzVKjzaU9cy8ZLUZfx961f2thY1TWxH2DUjxD0lwJ3bM03oMdMAVmDf-dJ82FbT--H_N1820c4xa6IWmhkBo_36l7NoUNVJeB7N6ZbrDtPu48onQUQh-DVsD5XwMgyD7Sz-357xURAy9tNVM_4TD8Cw7o-JvICeA==',
      newsletter: '',
      test:       '',
      compendi:   '',
      psicovoice: ''
    },

    // Nomi dei campi come sono configurati in Brevo (Contatti > Impostazioni >
    // Attributi dei contatti). EMAIL è standard; NOME e FONTE sono attributi che
    // crei tu (tipo "Testo"). Cambia questi valori solo se in Brevo li chiami
    // diversamente.
    fields: {
      email:  'EMAIL',
      name:   'NOME',
      source: 'FONTE'
    },

    // Ripiego se nessun endpoint è ancora configurato: apre il client di posta
    // dell'utente con una mail pre-indirizzata a te. Spento dal 29/07/2026, da
    // quando Brevo è attivo: dipendeva dal client di posta del visitatore e su
    // mobile spesso non partiva, quindi i contatti si perdevano in silenzio.
    fallbackMailto: false,
    fallbackEmail:  'alberto.delbove.psicoterapeuta@gmail.com'
  };

  /* ---------- Funzioni pure (testabili anche in Node) ---------- */

  // Validazione email semplice ma robusta (stessa regola di quiz-core.js).
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  // Ricava l'endpoint per una data fonte. Le fonti composte ("test-adhd")
  // ricadono prima sulla loro famiglia ("test") e poi su `default`, così basta
  // configurare un endpoint per famiglia anche se la fonte è granulare.
  function resolveEndpoint(source, config) {
    var cfg = config || CONFIG;
    var eps = cfg.endpoints || {};
    var key = String(source || '').trim();
    if (key && eps[key]) { return eps[key]; }
    var dash = key.indexOf('-');
    if (dash > 0 && eps[key.slice(0, dash)]) { return eps[key.slice(0, dash)]; }
    return eps.default || '';
  }

  // Compone la mappa dei campi da inviare al modulo Brevo. Pura: riceve un
  // oggetto, restituisce un oggetto { nomeCampo: valore }. Include NOME e FONTE
  // solo se valorizzati, più i campi tecnici attesi dal modulo ospitato.
  function buildPayload(data, config) {
    data = data || {};
    var cfg = config || CONFIG;
    var f = cfg.fields || {};
    var payload = {};
    payload[f.email || 'EMAIL'] = String(data.email || '').trim();
    var name = String(data.name || '').trim();
    if (name && f.name) { payload[f.name] = name; }
    var source = String(data.source || '').trim();
    if (source && f.source) { payload[f.source] = source; }
    // Campi tecnici del modulo Brevo ospitato.
    payload.email_address_check = '';            // honeypot anti-bot: deve restare vuoto
    payload.locale = data.lang || 'it';          // lingua dell'iscrizione
    payload.html_type = 'simple';
    return payload;
  }

  /* ---------- Parte browser (cablaggio del DOM) ---------- */

  var hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';

  // Riusa il validatore di QuizCore se presente (unica fonte di verità).
  function validEmail(email) {
    if (hasDOM && window.QuizCore && typeof window.QuizCore.isValidEmail === 'function') {
      return window.QuizCore.isValidEmail(email);
    }
    return isValidEmail(email);
  }

  // Legge una stringa tradotta dal dizionario i18n, con fallback all'italiano.
  function t(key, itDefault) {
    if (hasDOM && window.SiteI18N && typeof window.SiteI18N.t === 'function') {
      var v = window.SiteI18N.t(key);
      if (v != null) { return v; }
    }
    return itDefault;
  }

  function currentLang() {
    if (hasDOM && window.SiteI18N && window.SiteI18N.lang) { return window.SiteI18N.lang; }
    return 'it';
  }

  // <iframe> nascosto e condiviso: bersaglio del POST così la pagina non naviga.
  var sinkFrame = null;
  function getSink() {
    if (sinkFrame) { return sinkFrame; }
    sinkFrame = document.createElement('iframe');
    sinkFrame.name = 'nl-sink-frame';
    sinkFrame.setAttribute('aria-hidden', 'true');
    sinkFrame.tabIndex = -1;
    sinkFrame.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px;top:-9999px;';
    document.body.appendChild(sinkFrame);
    return sinkFrame;
  }

  // Invia i dati a Brevo tramite POST su iframe nascosto (nessun problema CORS).
  function postToBrevo(endpoint, payload) {
    getSink();
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = 'nl-sink-frame';
    form.style.display = 'none';
    Object.keys(payload).forEach(function (key) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = payload[key];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    setTimeout(function () { if (form.parentNode) { form.parentNode.removeChild(form); } }, 1500);
  }

  // Ripiego: apre il client di posta con una mail pre-indirizzata a te.
  function fallbackMailto(data) {
    var subject = 'Nuova iscrizione newsletter dal sito';
    var body = 'Vorrei iscrivermi alla newsletter.\n\n' +
      'Email: ' + (data.email || '') + '\n' +
      (data.name ? 'Nome: ' + data.name + '\n' : '') +
      'Fonte: ' + (data.source || 'newsletter') + '\n';
    window.location.href = 'mailto:' + CONFIG.fallbackEmail +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  // Iscrive un contatto. Restituisce una Promise: { ok, mode }.
  function subscribe(data) {
    data = data || {};
    return new Promise(function (resolve, reject) {
      if (!validEmail(data.email)) {
        reject({ ok: false, reason: 'email' });
        return;
      }
      var endpoint = resolveEndpoint(data.source, CONFIG);
      if (endpoint) {
        postToBrevo(endpoint, buildPayload(data, CONFIG));
        resolve({ ok: true, mode: 'brevo' });
        return;
      }
      if (CONFIG.fallbackMailto) {
        fallbackMailto(data);
        resolve({ ok: true, mode: 'mailto' });
        return;
      }
      reject({ ok: false, reason: 'unconfigured' });
    });
  }

  // Mostra un messaggio nell'elemento [data-nl-feedback] del form. Usa solo
  // utility Tailwind (stessa logica del form contatti) così il CSS compilato le
  // include senza classi custom.
  function setFeedback(form, message, isError) {
    var box = form.querySelector('[data-nl-feedback]');
    if (!box) { return; }
    box.textContent = message;
    box.classList.remove('hidden', 'bg-red-50', 'text-red-800', 'bg-mirtillo-100', 'text-mirtillo-700');
    if (isError) {
      box.classList.add('bg-red-50', 'text-red-800');
    } else {
      box.classList.add('bg-mirtillo-100', 'text-mirtillo-700');
    }
  }

  // Cabla un singolo <form data-newsletter data-nl-source="…">.
  function attachForm(form) {
    if (!form || form.__nlBound) { return; }
    form.__nlBound = true;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailEl   = form.querySelector('input[type="email"], input[name="email"]');
      var nameEl    = form.querySelector('input[name="name"]');
      var consentEl = form.querySelector('input[name="consent"]');
      var submitEl  = form.querySelector('button[type="submit"], [data-nl-submit]');
      var email = emailEl ? emailEl.value : '';

      if (!validEmail(email)) {
        setFeedback(form, t('nl.err.email', 'Controlla l’indirizzo email: sembra incompleto.'), true);
        if (emailEl) { emailEl.focus(); }
        return;
      }
      if (consentEl && !consentEl.checked) {
        setFeedback(form, t('nl.err.consent', 'Per iscriverti serve il tuo consenso al trattamento dei dati.'), true);
        return;
      }

      var restore = null;
      if (submitEl) {
        restore = submitEl.innerHTML;
        submitEl.disabled = true;
        submitEl.classList.add('opacity-70', 'cursor-wait');
      }

      subscribe({
        email:  email,
        name:   nameEl ? nameEl.value : '',
        source: form.getAttribute('data-nl-source') || 'newsletter',
        lang:   currentLang()
      }).then(function (res) {
        if (res.mode === 'mailto') {
          setFeedback(form, t('nl.ok.mailto', 'Si sta aprendo il tuo programma di posta con la richiesta già pronta: inviala per completare.'), false);
        } else {
          setFeedback(form, t('nl.ok', 'Ci siamo quasi! Ti ho inviato una email di conferma: clicca il link al suo interno per completare l’iscrizione.'), false);
        }
        form.reset();
      }).catch(function () {
        setFeedback(form, t('nl.err.generic', 'Qualcosa non ha funzionato. Riprova, oppure scrivimi direttamente.'), true);
      }).then(function () {
        if (submitEl) {
          submitEl.disabled = false;
          submitEl.classList.remove('opacity-70', 'cursor-wait');
          if (restore != null) { submitEl.innerHTML = restore; }
        }
      });
    });
  }

  // Cabla tutti i form della pagina e segnala se la config è ancora vuota.
  function init() {
    document.querySelectorAll('form[data-newsletter]').forEach(attachForm);
    var anyEndpoint = Object.keys(CONFIG.endpoints).some(function (k) { return !!CONFIG.endpoints[k]; });
    if (!anyEndpoint && window.console && console.info) {
      console.info('[newsletter] Nessun endpoint Brevo configurato: attivo il ripiego via email. ' +
                   'Compila CONFIG.endpoints in assets/newsletter.js — vedi NEWSLETTER-SETUP.md.');
    }
  }

  if (hasDOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    CONFIG: CONFIG,
    isValidEmail: isValidEmail,
    resolveEndpoint: resolveEndpoint,
    buildPayload: buildPayload,
    subscribe: subscribe,
    attachForm: attachForm
  };
});
