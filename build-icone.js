#!/usr/bin/env node
/* ============================================================
   build-icone.js — le icone del sito in un file solo, nostro
   ------------------------------------------------------------
   PERCHÉ ESISTE

   Le icone sono di Lucide. Fino a ottobre 2026 ogni pagina scaricava
   da unpkg l'intera libreria, 618 KB di JavaScript con duemila icone,
   per usarne una settantina. Su un telefono in 4G sono secondi persi
   proprio nelle pagine che ricevono gli annunci, e Google li conta
   nell'esperienza della pagina.

   Questo script cerca nei sorgenti i nomi delle icone usate davvero e
   scrive assets/icone.js con quelle sole. Il file espone lo stesso
   window.lucide.createIcons() di prima, quindi il resto del codice
   non cambia.

   COME FUNZIONA

   Raccoglie ogni parola fra virgolette che abbia la forma di un nome
   Lucide (data-lucide="phone", ma anche 'gift' dentro uno script che
   cambia icona al volo) e tiene quelle che esistono nella libreria.
   Qualche parola comune finisce dentro senza servire: costa pochi
   byte e garantisce che nessuna icona resti vuota.

   USO
     npm run build:icone   (è dentro npm run build)
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { icons } = require('lucide');

const RADICE = __dirname;
const USCITA = path.join(RADICE, 'assets', 'icone.js');
const SALTA = new Set(['node_modules', '.git', '.claude', 'Drive Sito web Alberto', 'pdf']);
const ESTENSIONI = new Set(['.html', '.js', '.md']);

function sorgenti(dir, trovati = []) {
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SALTA.has(voce.name)) continue;
    const pieno = path.join(dir, voce.name);
    if (voce.isDirectory()) sorgenti(pieno, trovati);
    else if (ESTENSIONI.has(path.extname(voce.name)) && pieno !== USCITA) trovati.push(pieno);
  }
  return trovati;
}

// Stessa conversione che fa Lucide: "calendar-heart" → "CalendarHeart"
const pascal = nome => nome.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

const usate = new Map();
for (const file of sorgenti(RADICE)) {
  const testo = fs.readFileSync(file, 'utf8');
  for (const [, nome] of testo.matchAll(/["']([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["']/g)) {
    const nodo = icons[pascal(nome)];
    if (nodo && !usate.has(nome)) usate.set(nome, nodo);
  }
}

const elenco = Object.fromEntries([...usate].sort(([a], [b]) => a.localeCompare(b)));

const codice = `/* Generato da build-icone.js: non modificare a mano.
   ${usate.size} icone di Lucide 1.28.0 (licenza ISC), con lo stesso
   window.lucide.createIcons() della libreria completa. */
(function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var BASE = {
    xmlns: SVG, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  };
  var ICONE = ${JSON.stringify(elenco)};

  function haDescrizione(el) {
    for (var i = 0; i < el.attributes.length; i++) {
      var n = el.attributes[i].name;
      if (n.indexOf('aria-') === 0 || n === 'role' || n === 'title') { return true; }
    }
    return false;
  }

  function disegna(el) {
    var nome = el.getAttribute('data-lucide');
    var nodo = ICONE[nome];
    if (!nodo) { console.warn('Icona non inclusa in icone.js: ' + nome); return; }
    // Già disegnata con questo nome: niente da fare. Se il nome è
    // cambiato (succede nel lettore degli articoli) la ridisegno.
    if (el.namespaceURI === SVG && el.getAttribute('data-icona') === nome) { return; }

    var svg = document.createElementNS(SVG, 'svg');
    Object.keys(BASE).forEach(function (k) { svg.setAttribute(k, BASE[k]); });
    if (!haDescrizione(el)) { svg.setAttribute('aria-hidden', 'true'); }
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name !== 'class') { svg.setAttribute(a.name, a.value); }
    }
    var classi = (el.getAttribute('class') || '').split(/\\s+/).filter(function (c) {
      return c && c !== 'lucide' && c.indexOf('lucide-') !== 0;
    });
    svg.setAttribute('class', ['lucide', 'lucide-' + nome].concat(classi).join(' '));
    svg.setAttribute('data-icona', nome);

    nodo.forEach(function (forma) {
      var figlio = document.createElementNS(SVG, forma[0]);
      Object.keys(forma[1]).forEach(function (k) { figlio.setAttribute(k, forma[1][k]); });
      svg.appendChild(figlio);
    });
    el.parentNode.replaceChild(svg, el);
  }

  window.lucide = {
    createIcons: function () {
      document.querySelectorAll('[data-lucide]').forEach(disegna);
    }
  };
})();
`;

fs.writeFileSync(USCITA, codice);
console.log(`assets/icone.js: ${usate.size} icone, ${(Buffer.byteLength(codice) / 1024).toFixed(1)} KB.`);
