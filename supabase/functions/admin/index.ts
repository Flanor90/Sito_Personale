// ============================================================
// admin — tutto ciò che richiede i segreti
// ------------------------------------------------------------
// Il pannello legge contatti, messaggi e statistiche direttamente dal
// database (RLS lo autorizza perché è Alberto). Passa da qui solo per
// le cose che il browser NON deve poter fare:
//   • leggere e salvare le credenziali SMTP e Trello
//   • inviare email
//   • parlare con l'API di Trello
//
// Così la password per le app di Gmail e il token Trello restano sul
// server: chi aprisse il sorgente del pannello non troverebbe nulla.
// ============================================================

import {
  type ImpostazioniSito,
  type ImpostazioniSmtp,
  type ImpostazioniTrello,
  leggiImpostazioni,
  salvaImpostazioni,
  servizio,
} from './lib/db.ts';
import { connessione, cornice, smtpConfigurato } from './lib/mail.ts';
import { bacheche, chiSono, creaScheda, liste } from './lib/trello.ts';
import { cors, esc, json, nuovoToken, testo } from './lib/util.ts';

/** Ciò che il pannello vede al posto di un segreto salvato. */
const MASCHERA = '••••••••';

/**
 * Le sole azioni concesse a un utente di sola lettura (ruolo 'lettura',
 * per esempio megamind). Tutto il resto — inviare, salvare credenziali,
 * creare schede, importare — richiede il ruolo 'admin'.
 *
 * L'elenco è per permesso, non per divieto: un'azione nuova è vietata
 * finché non la si aggiunge qui di proposito. È il verso giusto in cui
 * sbagliare.
 */
const AZIONI_SOLA_LETTURA = new Set([
  'settings.get',
  'trello.boards',
  'trello.lists',
]);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ ok: false }, 405, origin);

  const sb = servizio();

  /* ---------- Chi sta chiamando? ---------- */
  // Non mi fido del solo controllo del gateway: la chiave anonima è
  // anch'essa un JWT valido per il progetto. Verifico che dietro ci sia
  // un utente vero e che la sua email sia fra gli amministratori.
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await sb.auth.getUser(bearer);
  if (!user?.email) return json({ ok: false, errore: 'non autenticato' }, 401, origin);

  const { data: admin } = await sb
    .from('admin_emails').select('email, ruolo').ilike('email', user.email).maybeSingle();
  if (!admin) return json({ ok: false, errore: 'non autorizzato' }, 403, origin);

  const body = await req.json().catch(() => ({}));
  const azione = String(body.action ?? '');

  // Qui il controllo del ruolo è indispensabile: sotto, questa funzione
  // usa la chiave di servizio, che scavalca le regole del database. Le
  // policy RLS non proteggono nulla di ciò che accade da questo punto
  // in poi — protegge solo questa riga.
  if (admin.ruolo !== 'admin' && !AZIONI_SOLA_LETTURA.has(azione)) {
    return json({
      ok: false,
      errore: 'Questo accesso è di sola lettura: non può inviare email né modificare le impostazioni.',
    }, 403, origin);
  }

  try {
    switch (azione) {
      case 'settings.get':        return json(await leggiTutte(sb), 200, origin);
      case 'settings.save':       return json(await salva(sb, body), 200, origin);
      case 'smtp.test':           return json(await provaSmtp(sb, user.email), 200, origin);
      case 'trello.test':         return json(await provaTrello(sb), 200, origin);
      case 'trello.boards':       return json(await elencoBacheche(sb), 200, origin);
      case 'trello.lists':        return json(await elencoListe(sb, body), 200, origin);
      case 'trello.card':         return json(await schedaManuale(sb, body), 200, origin);
      case 'newsletter.test':     return json(await provaNewsletter(sb, body, user.email), 200, origin);
      case 'newsletter.send':     return json(await inviaLotto(sb, body), 200, origin);
      case 'contacts.import':     return json(await importa(sb, body), 200, origin);
      default:                    return json({ ok: false, errore: 'azione sconosciuta' }, 400, origin);
    }
  } catch (e) {
    console.error('[admin]', azione, e);
    // Qui il messaggio serve: è Alberto a leggerlo e deve capire cosa
    // sistemare (password sbagliata, porta chiusa, token scaduto…).
    return json({ ok: false, errore: (e as Error).message ?? 'errore' }, 500, origin);
  }
});

/* ============================================================
   Impostazioni
   ============================================================ */

async function leggiTutte(sb: ReturnType<typeof servizio>) {
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const trello = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');

  return {
    ok: true,
    smtp: { ...smtp, pass: smtp.pass ? MASCHERA : '' },
    trello: {
      ...trello,
      key: trello.key ? MASCHERA : '',
      token: trello.token ? MASCHERA : '',
    },
    sito,
  };
}

/** Salva senza mai cancellare un segreto per distrazione. */
async function salva(sb: ReturnType<typeof servizio>, body: Record<string, unknown>) {
  if (body.smtp) {
    const vecchie = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
    const nuove = body.smtp as ImpostazioniSmtp;
    await salvaImpostazioni(sb, 'smtp', {
      ...nuove,
      port: Number(nuove.port) || 465,
      // Se il campo è ancora la maschera, l'utente non l'ha toccato:
      // tengo la password che c'era.
      pass: !nuove.pass || nuove.pass === MASCHERA ? (vecchie.pass ?? '') : nuove.pass,
    });
  }

  if (body.trello) {
    const vecchie = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
    const nuove = body.trello as ImpostazioniTrello;
    await salvaImpostazioni(sb, 'trello', {
      ...nuove,
      key: !nuove.key || nuove.key === MASCHERA ? (vecchie.key ?? '') : nuove.key,
      token: !nuove.token || nuove.token === MASCHERA ? (vecchie.token ?? '') : nuove.token,
    });
  }

  if (body.sito) await salvaImpostazioni(sb, 'sito', body.sito as Record<string, unknown>);

  return await leggiTutte(sb);
}

/* ============================================================
   Prove di collegamento
   ============================================================ */

async function provaSmtp(sb: ReturnType<typeof servizio>, a: string) {
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  if (!smtpConfigurato(smtp)) throw new Error('Compila prima host, porta, utente, password e mittente.');

  const conn = await connessione(smtp);
  await conn.invia({
    a,
    oggetto: 'Prova di invio dal pannello',
    testo: 'Se leggi questo messaggio, la configurazione SMTP funziona.',
    html: cornice({
      sito,
      contenuto: `<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;
                    color:#1B2A3A;font-weight:normal;">Funziona</h1>
        <p style="margin:0;">Se leggi questo messaggio, il pannello è collegato alla tua
        casella e le newsletter possono partire da qui.</p>`,
    }),
  });
  await conn.chiudi();
  return { ok: true, messaggio: `Email di prova inviata a ${a}.` };
}

async function provaTrello(sb: ReturnType<typeof servizio>) {
  const t = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
  const me = await chiSono(t);
  return { ok: true, messaggio: `Collegato come ${me.fullName || me.username}.` };
}

async function elencoBacheche(sb: ReturnType<typeof servizio>) {
  const t = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
  return { ok: true, bacheche: await bacheche(t) };
}

async function elencoListe(sb: ReturnType<typeof servizio>, body: Record<string, unknown>) {
  const t = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
  const board = testo(body.board_id, 64);
  if (!board) throw new Error('Scegli prima una bacheca.');
  return { ok: true, liste: await liste(t, board) };
}

/** Crea a mano una scheda da un messaggio già arrivato (o riprova dopo un errore). */
async function schedaManuale(sb: ReturnType<typeof servizio>, body: Record<string, unknown>) {
  const t = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');
  const id = testo(body.message_id, 64);
  if (!id) throw new Error('Manca il messaggio.');

  const { data: m } = await sb.from('messages').select('*').eq('id', id).maybeSingle();
  if (!m) throw new Error('Messaggio non trovato.');
  if (!t.list_id) throw new Error('Scegli prima la lista di destinazione nelle impostazioni.');

  const righe = [
    `**Email:** ${m.email}`,
    m.phone ? `**Telefono:** ${m.phone}` : '',
    m.setting ? `**Setting preferito:** ${m.setting}` : '',
    m.topics?.length ? `**Temi:** ${m.topics.join(' · ')}` : '',
    '',
    m.body ?? '',
  ].filter(Boolean).join('\n');

  const scheda = await creaScheda(t, {
    listId: t.list_id,
    titolo: `${m.name || m.email} — primo colloquio`,
    descrizione: righe,
    scadenzaGiorni: 2,
  });

  await sb.from('messages')
    .update({ trello_card_id: scheda.id, trello_card_url: scheda.url }).eq('id', id);

  return { ok: true, url: scheda.url };
}

/* ============================================================
   Newsletter
   ============================================================ */

/** Sostituisce i segnaposto con i dati del destinatario. */
function personalizza(testoOriginale: string, c: { name?: string | null; email: string }): string {
  const nome = (c.name ?? '').trim().split(/\s+/)[0] || '';
  return testoOriginale
    .replace(/\{\{\s*nome\s*\}\}/gi, esc(nome))
    .replace(/\{\{\s*email\s*\}\}/gi, esc(c.email));
}

/** Toglie qualunque script dal corpo, anche se scritto per sbaglio. */
function ripulisci(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/** Link di disiscrizione personale, riusato se già esistente. */
async function linkDisiscrizione(sb: ReturnType<typeof servizio>, contactId: string): Promise<string> {
  const { data } = await sb.from('tokens')
    .select('token').eq('contact_id', contactId).eq('purpose', 'unsubscribe').maybeSingle();

  let token = data?.token;
  if (!token) {
    token = nuovoToken();
    await sb.from('tokens').insert({ token, contact_id: contactId, purpose: 'unsubscribe' });
  }
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/api/unsubscribe?t=${token}`;
}

async function provaNewsletter(
  sb: ReturnType<typeof servizio>,
  body: Record<string, unknown>,
  a: string,
) {
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  const { data: nl } = await sb.from('newsletters')
    .select('*').eq('id', testo(body.id, 64)).maybeSingle();
  if (!nl) throw new Error('Bozza non trovata.');

  const finto = { name: 'Nome', email: a };
  const conn = await connessione(smtp);
  await conn.invia({
    a,
    oggetto: `[PROVA] ${personalizza(nl.subject, finto)}`,
    testo: personalizza(nl.body_md, finto),
    html: cornice({
      sito,
      preheader: nl.preheader ?? undefined,
      contenuto: personalizza(ripulisci(nl.body_html), finto),
      linkDisiscrizione: 'https://www.albertodelbove-psicologo.it/',
      testoDisiscrizione: 'Questa è una prova: il link qui sotto sarà quello vero.',
    }),
  });
  await conn.chiudi();
  return { ok: true, messaggio: `Prova inviata a ${a}.` };
}

/**
 * Invia UN lotto e restituisce quanti ne restano. Il pannello richiama
 * finché non arriva a zero.
 *
 * Perché a lotti: una Edge Function ha un tempo massimo di esecuzione, e
 * Gmail non gradisce centinaia di messaggi consecutivi. Ogni destinatario
 * ha la sua riga di stato, quindi se qualcosa si interrompe si riprende
 * esattamente da dove eravamo, senza mandare doppioni.
 */
async function inviaLotto(sb: ReturnType<typeof servizio>, body: Record<string, unknown>) {
  const id = testo(body.id, 64);
  if (!id) throw new Error('Manca la newsletter.');

  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  if (!smtpConfigurato(smtp)) throw new Error('SMTP non configurato.');

  const { data: nl } = await sb.from('newsletters').select('*').eq('id', id).maybeSingle();
  if (!nl) throw new Error('Newsletter non trovata.');
  if (nl.status === 'inviata') return { ok: true, stato: 'inviata', rimanenti: 0 };

  /* --- Primo giro: fisso l'elenco dei destinatari --- */
  if (nl.status === 'bozza') {
    const { data: pubblico, error } = await sb.rpc('audience_contacts', { p_audience: nl.audience });
    if (error) throw error;

    const righe = (pubblico ?? []).map((c: { id: string; email: string }) => ({
      newsletter_id: id,
      contact_id: c.id,
      email: c.email,
    }));

    if (!righe.length) throw new Error('Nessun destinatario corrisponde ai filtri scelti.');

    // ignoreDuplicates: se rilancio, non ricreo le righe già presenti.
    await sb.from('newsletter_recipients').upsert(righe, {
      onConflict: 'newsletter_id,contact_id',
      ignoreDuplicates: true,
    });

    await sb.from('newsletters')
      .update({ status: 'in_invio', total: righe.length }).eq('id', id);
  }

  /* --- Lotto corrente --- */
  const dimensione = Math.min(Math.max(Number(smtp.batch) || 25, 1), 60);
  const pausa = Math.min(Math.max(Number(smtp.delay_ms) || 400, 0), 5000);

  const { data: lotto } = await sb.from('newsletter_recipients')
    .select('*').eq('newsletter_id', id).eq('status', 'in_coda').limit(dimensione);

  if (!lotto?.length) {
    await sb.from('newsletters')
      .update({ status: 'inviata', sent_at: new Date().toISOString() }).eq('id', id);
    return { ok: true, stato: 'inviata', rimanenti: 0, inviate: 0, errori: 0 };
  }

  const corpoPulito = ripulisci(nl.body_html);
  let inviate = 0;
  let errori = 0;

  const conn = await connessione(smtp);
  try {
    for (const r of lotto) {
      try {
        const { data: c } = await sb.from('contacts')
          .select('name, email').eq('id', r.contact_id).single();
        const dati = { name: c?.name, email: r.email };
        const disiscrizione = await linkDisiscrizione(sb, r.contact_id);

        await conn.invia({
          a: r.email,
          oggetto: personalizza(nl.subject, dati),
          testo: `${personalizza(nl.body_md, dati)}\n\n---\nPer non ricevere più queste email: ${disiscrizione}`,
          html: cornice({
            sito,
            preheader: nl.preheader ?? undefined,
            contenuto: personalizza(corpoPulito, dati),
            linkDisiscrizione: disiscrizione,
          }),
          disiscrizione,
        });

        await sb.from('newsletter_recipients')
          .update({ status: 'inviata', sent_at: new Date().toISOString(), error: null })
          .eq('id', r.id);
        inviate++;
      } catch (e) {
        // Un indirizzo che rifiuta non deve fermare gli altri.
        await sb.from('newsletter_recipients')
          .update({ status: 'errore', error: String((e as Error).message).slice(0, 400) })
          .eq('id', r.id);
        errori++;
      }
      if (pausa) await new Promise((r) => setTimeout(r, pausa));
    }
  } finally {
    await conn.chiudi();
  }

  /* --- Aggiorno i totali e dico quanto manca --- */
  const { count: rimanenti } = await sb.from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('newsletter_id', id).eq('status', 'in_coda');

  const { count: totInviate } = await sb.from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('newsletter_id', id).eq('status', 'inviata');

  const { count: totErrori } = await sb.from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('newsletter_id', id).eq('status', 'errore');

  const finita = (rimanenti ?? 0) === 0;
  await sb.from('newsletters').update({
    sent_count: totInviate ?? 0,
    failed_count: totErrori ?? 0,
    status: finita ? 'inviata' : 'in_invio',
    sent_at: finita ? new Date().toISOString() : null,
  }).eq('id', id);

  return {
    ok: true,
    stato: finita ? 'inviata' : 'in_invio',
    rimanenti: rimanenti ?? 0,
    inviate,
    errori,
    totali: { inviate: totInviate ?? 0, errori: totErrori ?? 0 },
  };
}

/* ============================================================
   Importazione contatti (es. l'elenco già confermato su Brevo)
   ============================================================ */

async function importa(sb: ReturnType<typeof servizio>, body: Record<string, unknown>) {
  const righe = Array.isArray(body.contacts) ? body.contacts : [];
  if (!righe.length) throw new Error('Nessun contatto da importare.');
  if (righe.length > 5000) throw new Error('Troppi contatti in una volta: dividi il file.');

  let nuovi = 0;
  let aggiornati = 0;
  let scartati = 0;

  for (const r of righe as Record<string, unknown>[]) {
    const email = String(r.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      scartati++;
      continue;
    }

    // Chi arriva da una lista già in double opt-in è confermato: il
    // consenso l'ha dato lì. Chiunque altro resta "pending".
    const confermato = r.status === 'confirmed';
    const { data: esistente } = await sb.from('contacts')
      .select('id').eq('email', email).maybeSingle();

    if (esistente) {
      await sb.from('contacts').update({
        last_source: testo(r.source, 60) ?? 'import',
        consent_newsletter: true,
      }).eq('id', esistente.id);
      aggiornati++;
    } else {
      await sb.from('contacts').insert({
        email,
        name: testo(r.name, 120),
        lang: ['it', 'en', 'es'].includes(String(r.lang)) ? String(r.lang) : 'it',
        first_source: testo(r.source, 60) ?? 'import',
        last_source: testo(r.source, 60) ?? 'import',
        status: confermato ? 'confirmed' : 'pending',
        consent_newsletter: true,
        consent_at: new Date().toISOString(),
        consent_proof: { origine: 'importazione', lista: testo(r.source, 60) ?? 'import' },
        confirmed_at: confermato ? new Date().toISOString() : null,
      });
      nuovi++;
    }
  }

  return { ok: true, nuovi, aggiornati, scartati };
}
