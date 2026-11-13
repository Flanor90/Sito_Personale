#!/usr/bin/env node
/* ============================================================
   indexnow.js: avvisa Bing (e gli altri motori IndexNow) che le
   pagine del sito sono cambiate.
   ------------------------------------------------------------
   Bing è l'indice da cui pesca anche la ricerca di ChatGPT e di altri
   assistenti: avvisarlo subito fa arrivare prima articoli e modifiche
   nelle risposte, invece di aspettare il passaggio del crawler.
   La chiave è pubblica per costruzione (sta nel file a08ddbdfd57fd97ea923daa46e63d202.txt alla
   radice del sito), serve solo a dimostrare che il sito è nostro.
   Se la chiamata fallisce non blocca niente: si riprova al giro dopo.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const HOST = 'www.albertodelbove-psicologo.it';
const KEY = 'a08ddbdfd57fd97ea923daa46e63d202';
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
urlList.push(`https://${HOST}/llms.txt`, `https://${HOST}/llms-full.txt`);

fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList })
})
  .then((r) => console.log(`IndexNow: ${r.status} per ${urlList.length} indirizzi`))
  .catch((e) => console.log(`IndexNow non raggiungibile (${e.message}), riprovo al prossimo giro.`));
