/* ============================================================
   Pagina /articoli/: le frasi che portano a un tema
   ------------------------------------------------------------
   Senza questo script le frasi sono ancore e tutti i temi restano
   visibili. Con lo script, scegliere una frase lascia in pagina solo il
   suo tema, segna la frase scelta (aria-current) e scrive il tema
   nell'indirizzo, così il link si può condividere. «Mostra tutti i temi»
   rimette la pagina com'era.
   ============================================================ */
(function () {
  var frasi = Array.prototype.slice.call(document.querySelectorAll('[data-frase]'));
  var blocchi = Array.prototype.slice.call(document.querySelectorAll('[data-blocco-tema]'));
  var stato = document.getElementById('temi-stato');
  var tutti = document.getElementById('temi-tutti');
  if (!frasi.length || !blocchi.length) { return; }

  function esiste(tema) {
    return blocchi.some(function (b) { return b.getAttribute('data-blocco-tema') === tema; });
  }

  function mostra(tema, scorri) {
    blocchi.forEach(function (b) { b.hidden = !!tema && b.getAttribute('data-blocco-tema') !== tema; });
    frasi.forEach(function (f) {
      if (f.getAttribute('data-frase') === tema) { f.setAttribute('aria-current', 'true'); }
      else { f.removeAttribute('aria-current'); }
    });
    if (stato) { stato.hidden = !tema; }
    try {
      history.replaceState(null, '', tema ? '#' + tema : location.pathname + location.search);
    } catch (e) { /* file:// o browser vecchio: il filtro funziona lo stesso */ }
    if (scorri && tema) {
      var bersaglio = stato || document.getElementById(tema);
      var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      bersaglio.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
      var titolo = document.getElementById('h-' + tema);
      if (titolo) { titolo.setAttribute('tabindex', '-1'); titolo.focus({ preventScroll: true }); }
    }
  }

  frasi.forEach(function (f) {
    f.addEventListener('click', function (e) {
      e.preventDefault();
      var tema = f.getAttribute('data-frase');
      mostra(f.getAttribute('aria-current') === 'true' ? '' : tema, true);
    });
  });

  if (tutti) {
    tutti.addEventListener('click', function () {
      mostra('', false);
      var primo = frasi[0];
      if (primo) { primo.closest('ul').scrollIntoView({ block: 'center' }); }
    });
  }

  var iniziale = location.hash.replace('#', '');
  if (iniziale && esiste(iniziale)) { mostra(iniziale, true); }
})();
