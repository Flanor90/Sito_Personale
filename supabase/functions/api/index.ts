// ============================================================
// api — le funzioni pubbliche chiamate dal sito
// ------------------------------------------------------------
//   POST /api/collect      raccoglie un'email da qualsiasi form
//   GET  /api/confirm      conferma l'iscrizione (double opt-in)
//   */   /api/unsubscribe  disiscrizione con un click
//   POST /api/track        visite e conversioni, senza cookie
//   GET  /api/ping         tiene sveglio il progetto
//
// Nessuna autenticazione: è il sito pubblico a chiamarla. Per questo
// ogni endpoint ha honeypot, freno anti-abuso e validazione severa,
// e nessuno di essi restituisce mai dati personali.
// ============================================================

import { entroIlLimite, type ImpostazioniSito, type ImpostazioniSmtp, type ImpostazioniTrello, leggiImpostazioni, servizio } from './lib/db.ts';
import { connessione, emailConferma, emailMateriale, emailNotificaRichiesta, type Materiale, smtpConfigurato } from './lib/mail.ts';
import { creaScheda, descrizioneRichiesta } from './lib/trello.ts';
import {
  cors,
  dominioReferrer,
  emailValida,
  esc,
  improntaChiamante,
  json,
  normalizzaEmail,
  nuovoToken,
  testo,
} from './lib/util.ts';

const SALE = 'adb-sito-2026';
const KIND_VALIDI = ['newsletter', 'test', 'compendi', 'contatto'];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });

  const rotta = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  try {
    switch (rotta) {
      case 'collect':     return await collect(req, origin);
      case 'confirm':     return await confirm(req);
      case 'unsubscribe': return await unsubscribe(req);
      case 'track':       return await track(req, origin);
      case 'ping':        return json({ ok: true }, 200, origin);
      default:            return json({ ok: false, errore: 'rotta sconosciuta' }, 404, origin);
    }
  } catch (e) {
    // Il dettaglio finisce nei log del progetto, non nella risposta:
    // chi chiama non deve poter dedurre com'è fatto il server.
    console.error('[api]', rotta, e);
    return json({ ok: false, errore: 'errore interno' }, 500, origin);
  }
});

/* ============================================================
   POST /api/collect
   ============================================================ */

async function collect(req: Request, origin: string | null): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false }, 405, origin);

  const b = await req.json().catch(() => ({}));

  // Honeypot: un campo invisibile che solo i bot compilano. Rispondiamo
  // "va tutto bene" senza salvare nulla, così il bot non capisce di
  // essere stato scoperto e non cambia strategia.
  if (testo(b.hp)) return json({ ok: true, stato: 'salvato' }, 200, origin);

  const email = normalizzaEmail(b.email);
  if (!emailValida(email)) return json({ ok: false, errore: 'email' }, 400, origin);

  const sb = servizio();
  const impronta = await improntaChiamante(req, SALE);
  if (!await entroIlLimite(sb, `collect:${impronta}`, 10, 60)) {
    return json({ ok: false, errore: 'troppe richieste' }, 429, origin);
  }

  const kind = KIND_VALIDI.includes(String(b.kind)) ? String(b.kind) : 'newsletter';
  const source = testo(b.source, 60) ?? kind;
  const lang = ['it', 'en', 'es'].includes(String(b.lang)) ? String(b.lang) : 'it';
  const nome = testo(b.name, 120);
  const telefono = testo(b.phone, 40);
  const consenso = b.consent === true;
  const pagina = testo(b.page, 300);
  const referrer = dominioReferrer(b.referrer);
  const ora = new Date().toISOString();

  const provaConsenso = {
    quando: ora,
    dove: pagina,
    fonte: source,
    // Utile per dimostrare che il consenso è stato dato da un browser reale.
    agente: testo(req.headers.get('user-agent'), 200),
  };

  /* ---------- Contatto: una riga per indirizzo ---------- */

  const { data: esistente } = await sb
    .from('contacts').select('*').eq('email', email).maybeSingle();

  let contatto = esistente;
  let daConfermare = false;

  if (!esistente) {
    const { data, error } = await sb.from('contacts').insert({
      email,
      name: nome,
      phone: telefono,
      lang,
      first_source: source,
      last_source: source,
      status: 'pending',
      consent_newsletter: consenso,
      consent_at: consenso ? ora : null,
      consent_proof: consenso ? provaConsenso : {},
    }).select().single();
    if (error) throw error;
    contatto = data;
    daConfermare = consenso;
  } else {
    const patch: Record<string, unknown> = { last_source: source, lang };
    // Non sovrascrivo mai un dato già noto con uno vuoto.
    if (nome && !esistente.name) patch.name = nome;
    if (telefono && !esistente.phone) patch.phone = telefono;

    if (consenso && !esistente.consent_newsletter) {
      patch.consent_newsletter = true;
      patch.consent_at = ora;
      patch.consent_proof = provaConsenso;
    }

    // Chi si era disiscritto e torna a iscriversi ricomincia da capo,
    // con una nuova email di conferma: il consenso vecchio non vale più.
    if (consenso && esistente.status === 'unsubscribed') {
      patch.status = 'pending';
      patch.unsubscribed_at = null;
      patch.consent_at = ora;
      patch.consent_proof = provaConsenso;
      daConfermare = true;
    } else if (consenso && esistente.status === 'pending') {
      daConfermare = true;
    }

    const { data, error } = await sb.from('contacts')
      .update(patch).eq('id', esistente.id).select().single();
    if (error) throw error;
    contatto = data;
  }

  await sb.from('contact_events').insert({
    contact_id: contatto!.id,
    kind,
    source,
    lang,
    page: pagina,
    referrer,
    payload: { consenso },
  });

  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const trello = await leggiImpostazioni<ImpostazioniTrello>(sb, 'trello');

  /* ---------- Richiesta di primo colloquio ---------- */

  let messaggioId: string | null = null;
  let linkTrello: string | null = null;

  if (kind === 'contatto') {
    const temi = Array.isArray(b.topics)
      ? b.topics.slice(0, 20).map((t: unknown) => testo(t, 80)).filter(Boolean) as string[]
      : [];
    const corpo = testo(b.message, 5000);
    const setting = testo(b.setting, 80);

    const { data: msg } = await sb.from('messages').insert({
      contact_id: contatto!.id,
      name: nome,
      email,
      phone: telefono,
      setting,
      topics: temi,
      body: corpo,
      lang,
    }).select().single();
    messaggioId = msg?.id ?? null;

    // Scheda Trello: se fallisce non deve far fallire la richiesta della
    // persona, che è la cosa importante. Registro l'errore e proseguo.
    if (trello.attivo && trello.list_id) {
      try {
        const scheda = await creaScheda(trello, {
          listId: trello.list_id,
          titolo: `${nome || email} — primo colloquio`,
          descrizione: descrizioneRichiesta({
            email, telefono, setting, temi, messaggio: corpo, lang, fonte: source,
          }),
          scadenzaGiorni: 2,
        });
        linkTrello = scheda.url;
        if (messaggioId) {
          await sb.from('messages')
            .update({ trello_card_id: scheda.id, trello_card_url: scheda.url })
            .eq('id', messaggioId);
        }
      } catch (e) {
        console.error('[collect] Trello:', e);
      }
    }

    // Avviso ad Alberto per email, così non deve controllare il pannello.
    if (smtpConfigurato(smtp) && smtp.from_email) {
      try {
        const conn = await connessione(smtp);
        const m = emailNotificaRichiesta({
          nome: nome || email, email, telefono, setting, temi, messaggio: corpo, linkTrello, sito,
        });
        await conn.invia({ a: smtp.reply_to || smtp.from_email, oggetto: m.oggetto, html: m.html, testo: m.testo });
        await conn.chiudi();
      } catch (e) {
        console.error('[collect] notifica:', e);
      }
    }
  } else if (trello.attivo && trello.list_id_newsletter) {
    // Anche una semplice email lasciata può diventare una scheda.
    try {
      const scheda = await creaScheda(trello, {
        listId: trello.list_id_newsletter,
        titolo: `${nome || email} — ${source}`,
        descrizione: descrizioneRichiesta({ email, telefono, temi: [], lang, fonte: source }),
      });
      linkTrello = scheda.url;
    } catch (e) {
      console.error('[collect] Trello newsletter:', e);
    }
  }

  /* ---------- Email: materiale gratuito e/o conferma ---------- */

  // Questa fonte consegna un materiale (es. la guida in PDF)?
  const materiali = await leggiImpostazioni<Record<string, Materiale>>(sb, 'materiali');
  const materiale = materiali[source] ?? null;

  let stato = 'salvato';

  if (daConfermare || materiale) {
    // Il token serve in entrambi i casi: come link di conferma nell'email
    // di iscrizione, o come poscritto in quella che consegna la guida.
    let linkConferma: string | undefined;

    if (daConfermare) {
      const token = nuovoToken();
      const scadenza = new Date(Date.now() + 7 * 864e5).toISOString();
      await sb.from('tokens').insert({
        token, contact_id: contatto!.id, purpose: 'confirm', expires_at: scadenza,
      });
      // Il link punta alla funzione, non al sito: così la conferma funziona
      // anche se un domani il sito cambia indirizzo o struttura.
      linkConferma = `${Deno.env.get('SUPABASE_URL')}/functions/v1/api/confirm?t=${token}`;
    }

    if (smtpConfigurato(smtp)) {
      try {
        const conn = await connessione(smtp);
        const m = materiale
          ? emailMateriale({ materiale, linkConferma, sito })
          : emailConferma({ lang, linkConferma: linkConferma!, sito });
        await conn.invia({ a: email, oggetto: m.oggetto, html: m.html, testo: m.testo });
        await conn.chiudi();
        stato = materiale ? 'materiale_inviato' : 'da_confermare';
      } catch (e) {
        console.error('[collect] invio:', e);
        stato = materiale ? 'materiale_non_inviato' : 'salvato_senza_conferma';
      }
    } else {
      // SMTP non ancora configurato. Il contatto è salvo e il pannello lo
      // segnala; per il materiale rispondo esplicitamente che non è partito,
      // così la pagina può offrire il download diretto invece di lasciare
      // la persona a mani vuote con una promessa non mantenuta.
      stato = materiale ? 'materiale_non_inviato' : 'salvato_senza_conferma';
    }
  } else if (contatto!.status === 'confirmed') {
    stato = 'gia_confermato';
  }

  return json({ ok: true, stato }, 200, origin);
}

/* ============================================================
   GET /api/confirm — il click nell'email di conferma
   ============================================================ */

async function confirm(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const sb = servizio();

  const { data: riga } = await sb.from('tokens')
    .select('*').eq('token', token).eq('purpose', 'confirm').maybeSingle();

  if (!riga) return pagina('Link non valido', 'Questo link di conferma non risulta più valido. Se vuoi iscriverti, torna sul sito e lascia di nuovo il tuo indirizzo.', false);

  if (riga.expires_at && new Date(riga.expires_at) < new Date()) {
    return pagina('Link scaduto', 'Questo link è scaduto. Torna sul sito e lascia di nuovo il tuo indirizzo: te ne invio uno nuovo.', false);
  }

  // Un token già usato non è un errore: capita di cliccare due volte.
  if (!riga.used_at) {
    const ora = new Date().toISOString();
    await sb.from('contacts')
      .update({ status: 'confirmed', confirmed_at: ora }).eq('id', riga.contact_id);
    await sb.from('tokens').update({ used_at: ora }).eq('token', token);
  }

  return pagina(
    'Iscrizione confermata',
    'Grazie: da ora ricevi i miei scritti. Ti scriverò di rado e potrai disiscriverti quando vuoi, con un click in fondo a ogni email.',
    true,
  );
}

/* ============================================================
   /api/unsubscribe — un click, e basta
   ============================================================ */

async function unsubscribe(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const sb = servizio();

  const { data: riga } = await sb.from('tokens')
    .select('*').eq('token', token).eq('purpose', 'unsubscribe').maybeSingle();

  if (!riga) return pagina('Link non valido', 'Non riesco a riconoscere questo link. Scrivimi e ti tolgo io dalla lista.', false);

  await sb.from('contacts').update({
    status: 'unsubscribed',
    unsubscribed_at: new Date().toISOString(),
    consent_newsletter: false,
  }).eq('id', riga.contact_id);

  // I client di posta che supportano la disiscrizione con un click
  // (RFC 8058) chiamano in POST e non mostrano nessuna pagina.
  if (req.method === 'POST') return new Response('ok', { status: 200 });

  return pagina(
    'Disiscrizione completata',
    'Non riceverai più le mie email. Nessun rancore: se cambi idea, il modulo sul sito è sempre lì.',
    true,
  );
}

/** Pagina di esito, autoportante e nei colori del sito. */
function pagina(titolo: string, corpo: string, positiva: boolean): Response {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titolo)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#F7F5F1;color:#2B2B2B;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:24px}
  .c{max-width:480px;background:#fff;border-radius:20px;padding:40px 34px;text-align:center;
     box-shadow:0 2px 20px rgba(27,42,58,.08)}
  .b{width:52px;height:52px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;
     justify-content:center;font-size:26px;background:${positiva ? '#E2E4F1' : '#F3EDE6'}}
  h1{margin:0 0 12px;font:normal 25px/1.25 Georgia,"Times New Roman",serif;color:#1B2A3A}
  p{margin:0 0 26px;color:#2B2B2Bcc}
  a{display:inline-block;background:#4C507F;color:#fff;text-decoration:none;font-weight:600;
    padding:12px 26px;border-radius:11px;font-size:15px}
</style></head><body><div class="c">
<div class="b">${positiva ? '✓' : '!'}</div>
<h1>${esc(titolo)}</h1><p>${esc(corpo)}</p>
<a href="https://www.albertodelbove-psicologo.it/">Torna al sito</a>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}

/* ============================================================
   POST /api/track — analitiche senza cookie
   ------------------------------------------------------------
   Accetta un lotto di eventi per chiamata: una visita lunga costa
   una manciata di richieste, non una per ogni click.
   ============================================================ */

async function track(req: Request, origin: string | null): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false }, 405, origin);

  // sendBeacon manda testo semplice: leggo il corpo grezzo e poi parso.
  const grezzo = await req.text();
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(grezzo);
  } catch {
    return json({ ok: false }, 400, origin);
  }

  const sessione = testo(b.session, 64);
  if (!sessione) return json({ ok: false }, 400, origin);

  const sb = servizio();
  const impronta = await improntaChiamante(req, SALE);
  // Largo: una persona può vedere molte pagine. Serve solo a fermare i bot.
  if (!await entroIlLimite(sb, `track:${impronta}`, 600, 60)) {
    return json({ ok: true }, 200, origin);
  }

  const viste = Array.isArray(b.views) ? b.views.slice(0, 30) : [];
  const eventi = Array.isArray(b.events) ? b.events.slice(0, 60) : [];

  if (viste.length) {
    await sb.from('page_views').insert(viste.map((v: Record<string, unknown>) => ({
      session_id: sessione,
      path: testo(v.path, 300) ?? '/',
      title: testo(v.title, 200),
      referrer_host: dominioReferrer(v.referrer),
      utm_source: testo(v.utm_source, 80),
      utm_medium: testo(v.utm_medium, 80),
      utm_campaign: testo(v.utm_campaign, 80),
      lang: testo(v.lang, 8),
      country: testo(v.country, 2),
      device: testo(v.device, 12),
      browser: testo(v.browser, 24),
      seconds: Number.isFinite(Number(v.seconds))
        ? Math.min(Math.max(0, Math.round(Number(v.seconds))), 7200)
        : null,
    })));
  }

  if (eventi.length) {
    await sb.from('events').insert(eventi.map((e: Record<string, unknown>) => ({
      session_id: sessione,
      name: testo(e.name, 60) ?? 'evento',
      path: testo(e.path, 300),
      props: typeof e.props === 'object' && e.props !== null ? e.props : {},
    })));
  }

  return json({ ok: true }, 200, origin);
}
