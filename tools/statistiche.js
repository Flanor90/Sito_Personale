#!/usr/bin/env node
/* ============================================================
   statistiche.js: l'andamento del sito, solo in numeri aggregati
   ------------------------------------------------------------
   Lo lancia il workflow «Statistiche» (a mano, da GitHub Actions). Legge
   dal database con l'API di gestione di Supabase e il token del
   repository. Il repository è pubblico e i log si vedono: per questo
   stampa SOLO conteggi (visite, pagine, provenienze, clic, richieste,
   prenotazioni), mai nomi, email o testi scritti dalle persone.
   ============================================================ */
'use strict';
const fs = require('fs');

const REF = 'ynmxgdcikqlgcupfszza';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const GIORNI = Number(process.env.GIORNI || 30);
// Le prove in locale (prima che il contatore le escludesse) non contano.
const VERE = `coalesce(referrer_host, '') <> 'localhost'`;

const QUERY = {
  'Visite per giorno (ultimi 14 giorni)': `
    select to_char(date_trunc('day', created_at at time zone 'Europe/Rome'), 'YYYY-MM-DD') as giorno,
           count(*) as pagine_viste, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '14 days'
    group by 1 order by 1`,
  'Totali del periodo': `
    select count(*) as pagine_viste, count(distinct session_id) as visite,
           round(avg(nullif(seconds, 0))) as secondi_medi_per_pagina
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days'`,
  'Pagine più viste': `
    select path as pagina, count(*) as viste, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days'
    group by 1 order by 2 desc limit 20`,
  'Da dove arrivano (sito di provenienza)': `
    select coalesce(referrer_host, '(diretto o sconosciuto)') as provenienza, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days'
    group by 1 order by 2 desc limit 15`,
  'Campagne (utm)': `
    select coalesce(utm_source, '-') as fonte, coalesce(utm_medium, '-') as mezzo,
           coalesce(utm_campaign, '-') as campagna, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days' and utm_source is not null
    group by 1, 2, 3 order by 4 desc limit 15`,
  'Dispositivo': `
    select coalesce(device, '-') as dispositivo, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days' group by 1 order by 2 desc`,
  'Paese': `
    select coalesce(country, '-') as paese, count(distinct session_id) as visite
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days' group by 1 order by 2 desc limit 10`,
  'Eventi': `
    select name as evento, count(*) as volte, count(distinct session_id) as visite
    from events where created_at > now() - interval '${GIORNI} days' group by 1 order by 2 desc limit 20`,
  'Clic sui pulsanti (etichetta)': `
    select props->>'etichetta' as pulsante, count(*) as clic
    from events where name = 'cta_click' and created_at > now() - interval '${GIORNI} days'
    group by 1 order by 2 desc limit 25`,
  'Test completati': `
    select props->>'fonte' as test, count(*) as volte
    from events where name = 'test_completato' and created_at > now() - interval '${GIORNI} days'
    group by 1 order by 2 desc`,
  'Contatti arrivati (per tipo e fonte)': `
    select kind as tipo, source as fonte, count(*) as volte
    from contact_events where created_at > now() - interval '${GIORNI} days'
      and kind not like 'accoglienza_%' and kind <> 'email_ricevuta'
    group by 1, 2 order by 3 desc`,
  'Richieste di colloquio per settimana': `
    select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as settimana, count(*) as richieste
    from messages where created_at > now() - interval '${GIORNI} days'
    group by 1 order by 1`,
  'Visite anomale (più di 10 pagine viste)': `
    select left(session_id, 6) as visita, count(*) as viste, count(distinct path) as pagine_diverse,
           min(path) as pagina, max(country) as paese, max(device) as dispositivo, max(browser) as browser,
           max(coalesce(referrer_host, '-')) as provenienza,
           to_char(min(created_at) at time zone 'Europe/Rome', 'MM-DD HH24:MI') as inizio,
           to_char(max(created_at) at time zone 'Europe/Rome', 'MM-DD HH24:MI') as fine
    from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days'
    group by session_id having count(*) > 10 order by 2 desc limit 15`,
  'Visite dagli Stati Uniti per pagina': `
    select path as pagina, count(distinct session_id) as visite, max(browser) as browser
    from page_views where country = 'US' and created_at > now() - interval '${GIORNI} days'
    group by 1 order by 2 desc limit 10`,
  'Pagine di arrivo da Google e richieste': `
    with prima as (
      select distinct on (session_id) session_id, path, referrer_host
      from page_views where ${VERE} and created_at > now() - interval '${GIORNI} days' order by session_id, created_at)
    select p.path as pagina_di_arrivo, count(*) as visite,
           count(*) filter (where exists (select 1 from events e where e.session_id = p.session_id and e.name = 'cta_click')) as con_clic,
           count(*) filter (where exists (select 1 from events e where e.session_id = p.session_id and e.name = 'contatto_inviato')) as con_richiesta
    from prima p where p.referrer_host like '%google%' group by 1 order by 2 desc limit 10`,
  'Prenotazioni dal calendario': `
    select status as stato, lang as lingua, count(*) as prenotazioni,
           count(*) filter (where slot_start > now()) as future,
           count(*) filter (where presenza_confermata_at is not null) as presenza_confermata
    from bookings where created_at > now() - interval '${GIORNI} days'
    group by 1, 2 order by 3 desc`,
};

async function chiedi(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

function tabella(righe) {
  if (!righe.length) return '_nessun dato_\n';
  const col = Object.keys(righe[0]);
  return [
    `| ${col.join(' | ')} |`, `| ${col.map(() => '---').join(' | ')} |`,
    ...righe.map((r) => `| ${col.map((c) => String(r[c] ?? '')).join(' | ')} |`),
  ].join('\n') + '\n';
}

(async () => {
  if (!TOKEN) { console.error('Manca SUPABASE_ACCESS_TOKEN'); process.exit(1); }
  let out = `# Andamento del sito, ultimi ${GIORNI} giorni\n\n`;
  for (const [titolo, sql] of Object.entries(QUERY)) {
    try {
      out += `## ${titolo}\n\n${tabella(await chiedi(sql))}\n`;
    } catch (e) {
      out += `## ${titolo}\n\n_errore: ${String(e.message).slice(0, 200)}_\n\n`;
    }
  }
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
})();
