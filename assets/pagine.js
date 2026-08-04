/* ============================================================
   pagine.js — comportamenti condivisi delle pagine dedicate
   ------------------------------------------------------------
   La home ha un blocco di JavaScript enorme che governa i test, gli
   articoli, il modulo contatti e la navigazione. Le pagine dedicate
   (/test/, /compendi/, /newsletter/) riusano la stessa intestazione e
   lo stesso piè di pagina, ma non hanno né test né modulo contatti:
   caricare lì quel blocco significherebbe cercare elementi che non
   esistono e riempire la console di errori.

   Qui c'è quindi soltanto ciò che serve all'intestazione condivisa:
   icone, menu mobile, tendina dei servizi, ombra allo scorrimento,
   comparsa graduale dei blocchi, anno nel piè di pagina.
   ============================================================ */
(function () {
  'use strict';

  function avvia() {
    /* ---------- Icone ---------- */
    function icone() { if (window.lucide) { window.lucide.createIcons(); } }
    icone();
    // La libreria delle icone arriva con "defer": se non è ancora pronta,
    // riprovo quando la pagina ha finito di caricare.
    if (!window.lucide) { window.addEventListener('load', icone); }

    /* ---------- Anno nel piè di pagina ---------- */
    var anno = document.getElementById('footer-year');
    if (anno) { anno.textContent = new Date().getFullYear(); }

    /* ---------- Intestazione: ombra quando si scorre ---------- */
    var header = document.getElementById('site-header');
    if (header) {
      var scorri = function () {
        if (window.scrollY > 40) {
          header.classList.add('shadow-md', 'bg-crema/95');
          header.classList.remove('bg-crema/80');
        } else {
          header.classList.remove('shadow-md', 'bg-crema/95');
          header.classList.add('bg-crema/80');
        }
      };
      window.addEventListener('scroll', scorri, { passive: true });
      scorri();
    }

    /* ---------- Barra di avanzamento della lettura ---------- */
    var barra = document.getElementById('scroll-progress');
    if (barra) {
      var avanza = function () {
        var altezza = document.documentElement.scrollHeight - window.innerHeight;
        // Su una pagina più corta della finestra la divisione darebbe
        // infinito: in quel caso la barra semplicemente resta a zero.
        barra.style.width = altezza > 0
          ? Math.min(100, (window.scrollY / altezza) * 100) + '%'
          : '0%';
      };
      window.addEventListener('scroll', avanza, { passive: true });
      avanza();
    }

    /* ---------- Tendina "Servizi" ---------- */
    var apri = document.getElementById('services-toggle');
    var menu = document.getElementById('services-menu');
    var tendina = document.getElementById('services-dropdown');
    if (apri && menu && tendina) {
      var chiudi = function () {
        menu.classList.add('hidden');
        apri.setAttribute('aria-expanded', 'false');
      };
      apri.addEventListener('click', function (e) {
        e.stopPropagation();
        if (menu.classList.contains('hidden')) {
          menu.classList.remove('hidden');
          apri.setAttribute('aria-expanded', 'true');
        } else { chiudi(); }
      });
      menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', chiudi); });
      document.addEventListener('click', function (e) {
        if (!tendina.contains(e.target)) { chiudi(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { chiudi(); }
      });
    }

    /* ---------- Menu mobile ---------- */
    var pulsante = document.getElementById('menu-toggle');
    var mobile = document.getElementById('mobile-menu');
    if (pulsante && mobile) {
      pulsante.addEventListener('click', function () {
        var aperto = !mobile.classList.contains('hidden');
        mobile.classList.toggle('hidden');
        pulsante.setAttribute('aria-expanded', String(!aperto));
        pulsante.innerHTML = aperto
          ? '<i data-lucide="menu" class="w-6 h-6" aria-hidden="true"></i>'
          : '<i data-lucide="x" class="w-6 h-6" aria-hidden="true"></i>';
        icone();
      });
      mobile.querySelectorAll('.mobile-link').forEach(function (link) {
        link.addEventListener('click', function () {
          mobile.classList.add('hidden');
          pulsante.setAttribute('aria-expanded', 'false');
          pulsante.innerHTML = '<i data-lucide="menu" class="w-6 h-6" aria-hidden="true"></i>';
          icone();
        });
      });
    }

    /* ---------- Comparsa graduale dei blocchi ---------- */
    var blocchi = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var osservatore = new IntersectionObserver(function (voci) {
        voci.forEach(function (v) {
          if (v.isIntersecting) {
            v.target.classList.add('is-visible');
            osservatore.unobserve(v.target);
          }
        });
      }, { threshold: 0.12 });
      blocchi.forEach(function (el) { osservatore.observe(el); });
    } else {
      // Browser senza IntersectionObserver: mostro tutto subito, invece
      // di lasciare la pagina bianca.
      blocchi.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---------- Click tracciati sulle chiamate all'azione ---------- */
    // analytics.js lo fa già da sé; qui non serve altro.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
