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
import {
  ACCOGLIENZA_GIORNI, avvisa, connessione, type DatiPrenotazione, destinatarioAvvisi, emailAccoglienza, emailAvviso,
  emailConferma, emailMateriale, emailNotificaRichiesta, emailPrenotazione, emailRicevutaRichiesta, inviaUna,
  type Materiale, smtpConfigurato,
} from './lib/mail.ts';
import { creaScheda, descrizioneRichiesta } from './lib/trello.ts';
import {
  type ImpostazioniCalendario, impegniCalendario, type Intervallo, orariLiberi, quandoLeggibile, sincronizzaEvento,
} from './lib/calendario.ts';
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
      case 'slots':       return await slots(req, origin);
      case 'booking':     return await booking(req, origin);
      default:            return json({ ok: false, errore: 'rotta sconosciuta' }, 404, origin);
    }
  } catch (e) {
    // Il dettaglio finisce nei log del progetto, non nella risposta:
    // chi chiama non deve poter dedurre com'è fatto il server.
    console.error('[api]', rotta, e);
    return json({ ok: false, errore: 'errore interno' }, 500, origin);
  }
});

/** Il nome umano di una fonte, per l'oggetto degli avvisi. */
function descriviFonte(fonte: string): string {
  if (fonte.startsWith('test')) return `Risultato del test richiesto (${fonte.replace(/^test-?/, '') || 'test'})`;
  if (fonte.startsWith('guida')) return `Guida richiesta (${fonte})`;
  if (fonte.startsWith('compend')) return 'Contatto dai compendi';
  if (fonte === 'newsletter') return 'Nuova iscrizione alla newsletter';
  return `Nuovo contatto dal sito (${fonte})`;
}

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

  // Un solo colloquio conoscitivo per indirizzo email: se ce n'è già uno in
  // attesa, proposto o confermato, non se ne prenota un secondo. Ma niente
  // porte chiuse: il messaggio arriva lo stesso ad Alberto e la persona
  // riceve di nuovo il link al suo appuntamento. Chi ha annullato può
  // riprenotare. Il confronto usa la forma canonica dell'indirizzo (vedi
  // emailCanonica), così gli alias Gmail contano come lo stesso indirizzo.
  const giaAttiva = kind === 'contatto' && testo(b.slot, 40) ? await prenotazioneAttiva(sb, email) : null;
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
    const supervisione = source === 'supervisione';

    // Orario scelto dal calendario del modulo: diventa una prenotazione in
    // attesa della conferma di Alberto. Se nel frattempo qualcuno l'ha preso,
    // la prenotazione nasce lo stesso e l'avviso lo segnala: Alberto ne
    // propone un altro, la persona non resta senza risposta.
    let pren: { riga: Record<string, string>; occupato: boolean } | null = null;
    const slotScelto = testo(b.slot, 40);
    if (!giaAttiva && slotScelto && !isNaN(Date.parse(slotScelto)) && Date.parse(slotScelto) > Date.now()) {
      const modo = /itri|studio/i.test(setting ?? '') ? 'studio' : 'online';
      const conf = await leggiImpostazioni<ImpostazioniCalendario>(sb, 'calendario');
      const liberi = await liberiPer(sb, conf, modo);
      const inizio = new Date(slotScelto).toISOString();
      const { data: riga } = await sb.from('bookings').insert({
        contact_id: contatto!.id, name: nome, email, phone: telefono, setting: modo, lang,
        slot_start: inizio,
        slot_end: new Date(Date.parse(inizio) + (conf.durata_min || 45) * 60000).toISOString(),
        token_persona: nuovoToken(), token_alberto: nuovoToken(),
      }).select().single();
      if (riga) {
        pren = { riga: await aggiornaCalendario(sb, conf, sito, riga, 'provvisorio'), occupato: !liberi.includes(inizio) };
      }
    }

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
          titolo: `${nome || email} — ${supervisione ? 'supervisione' : 'primo colloquio'}`,
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
    await avvisa(smtp, emailNotificaRichiesta({
      nome: nome || email, email, telefono, setting, temi, messaggio: corpo, linkTrello, sito, supervisione,
      prenotazione: pren ? {
        quando: quandoLeggibile(pren.riga.slot_start),
        dove: pren.riga.setting === 'studio' ? 'in studio a Itri' : 'online',
        link: linkPrenotazione(sito, pren.riga.token_alberto),
        occupato: pren.occupato,
      } : giaAttiva ? {
        quando: quandoLeggibile(giaAttiva.slot_start),
        dove: giaAttiva.setting === 'studio' ? 'in studio a Itri' : 'online',
        link: linkPrenotazione(sito, giaAttiva.token_alberto),
        gia: true,
      } : null,
    }));
    if (pren && messaggioId) {
      await sb.from('bookings').update({ message_id: messaggioId }).eq('id', pren.riga.id);
    }

    // E alla persona: la conferma che la richiesta è arrivata, che cosa
    // succede adesso e, se preferisce, WhatsApp.
    const ricevuta = giaAttiva
      ? emailPrenotazione({
        per: 'persona', evento: 'gia_prenotato', p: datiPrenotazione(giaAttiva),
        link: linkPrenotazione(sito, giaAttiva.token_persona), sito,
      })
      : pren
      ? emailPrenotazione({
        per: 'persona', evento: 'ricevuta', p: datiPrenotazione(pren.riga),
        link: linkPrenotazione(sito, pren.riga.token_persona), sito,
      })
      : emailRicevutaRichiesta({ nome, lang, sito, supervisione });
    if (await inviaUna(smtp, email, ricevuta)) {
      await sb.from('contact_events').insert({
        contact_id: contatto!.id, kind: 'email_ricevuta', source, lang, page: pagina, payload: {},
      });
    }
  } else {
    // Ogni altro contatto (newsletter, guida, risultati di un test chiesti
    // per email): prima arrivava solo nel pannello, ora anche per email.
    await avvisa(smtp, emailAvviso({
      titolo: `${descriviFonte(source)}: ${nome || email}`,
      sito,
      righe: [
        ['Email', email],
        ['Nome', nome],
        ['Telefono', telefono],
        ['Fonte', source],
        ['Pagina', pagina],
        ['Arriva da', referrer],
        ['Newsletter', consenso ? 'sì, da confermare' : 'no'],
        ['Lingua', lang],
        ['Già noto', esistente ? 'sì, contatto già in archivio' : 'no, nuovo'],
      ],
    }));
  }

  if (kind !== 'contatto' && trello.attivo && trello.list_id_newsletter) {
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

  return json({
    ok: true, stato,
    ...(giaAttiva ? { gia_prenotato: true, quando: quandoLeggibile(giaAttiva.slot_start, lang) } : {}),
  }, 200, origin);
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
  // Supabase serve l'HTML delle funzioni come testo semplice (la persona
  // vedrebbe il codice): la pagina vera sta sul sito, qui solo il rimando.
  const q = new URLSearchParams({ t: titolo, m: corpo, ok: positiva ? '1' : '0' });
  return new Response(null, {
    status: 302,
    headers: { Location: `https://www.albertodelbove-psicologo.it/esito/?${q}`, 'X-Robots-Tag': 'noindex' },
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

  // Le visite fanno anche da orologio: al massimo ogni 30 minuti una
  // chiamata manda le email di accoglienza arrivate a scadenza. Così non
  // serve nessun cron da configurare a parte.
  if (await entroIlLimite(sb, 'accoglienza', 1, 30)) {
    try {
      await accoglienza(sb);
    } catch (e) {
      console.error('[accoglienza]', e);
    }
    try {
      await promemoria(sb);
    } catch (e) {
      console.error('[promemoria]', e);
    }
  }

  if (eventi.length) {
    await avvisiDaEventi(sb, eventi, viste[0] as Record<string, unknown> | undefined);
    await sb.from('events').insert(eventi.map((e: Record<string, unknown>) => ({
      session_id: sessione,
      name: testo(e.name, 60) ?? 'evento',
      path: testo(e.path, 300),
      props: typeof e.props === 'object' && e.props !== null ? e.props : {},
    })));
  }

  return json({ ok: true }, 200, origin);
}

/* ============================================================
   Avvisi dagli eventi: test completati e WhatsApp dal modulo
   ------------------------------------------------------------
   Chi completa un test senza lasciare l'email non passa da collect:
   lo si sa solo dall'evento. L'avviso dice quale test e da dove, mai le
   risposte né il punteggio, come promesso nelle FAQ dei test.
   ============================================================ */

async function avvisiDaEventi(
  sb: ReturnType<typeof servizio>,
  eventi: Record<string, unknown>[],
  vista?: Record<string, unknown>,
) {
  const rilevanti = eventi.filter((e) => {
    const p = (e.props ?? {}) as Record<string, unknown>;
    return e.name === 'test_completato' || (e.name === 'contatto_inviato' && p.fonte === 'whatsapp');
  });
  if (!rilevanti.length) return;

  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  for (const e of rilevanti.slice(0, 3)) {
    const p = (e.props ?? {}) as Record<string, unknown>;
    const test = e.name === 'test_completato';
    await avvisa(smtp, emailAvviso({
      titolo: test
        ? `Test completato: ${testo(p.fonte, 40) ?? 'test'}`
        : 'Messaggio WhatsApp preparato dal modulo contatti',
      sito,
      righe: [
        ['Pagina', testo(e.path, 300)],
        ['Paese', vista ? testo(vista.country, 2) : null],
        ['Dispositivo', vista ? testo(vista.device, 12) : null],
        ['Arriva da', vista ? dominioReferrer(vista.referrer) ?? testo(vista.utm_source, 80) : null],
        ['Nota', test
          ? 'La persona ha visto il risultato. Se ha lasciato l\'email, arriva un avviso a parte.'
          : 'Il messaggio parte dal telefono della persona: controlla WhatsApp.'],
      ],
    }));
  }
}

/* ============================================================
   Accoglienza per chi si iscrive (vedi emailAccoglienza in mail.ts)
   ------------------------------------------------------------
   Tre email nei primi giorni dopo la conferma dell'iscrizione. Regole:
   - solo contatti confermati (consenso newsletter dato e verificato);
   - solo chi ha confermato DOPO l'attivazione del flusso: chi era già
     iscritto non riceve un benvenuto fuori tempo;
   - mai a chi ha già chiesto un colloquio: con lui parlo già io;
   - per ora solo in italiano, la lingua di quasi tutti gli iscritti;
   - ogni passo si registra in contact_events, quindi non parte due volte;
   - si spegne dal pannello mettendo app_settings.accoglienza.attivo = false.
   ============================================================ */

type ImpostazioniAccoglienza = { attivo?: boolean; dal?: string };

async function accoglienza(sb: ReturnType<typeof servizio>) {
  const conf = await leggiImpostazioni<ImpostazioniAccoglienza>(sb, 'accoglienza');
  if (conf.attivo === false) return;
  if (!conf.dal) {
    // Prima volta: da adesso in poi. Il passato non si tocca.
    await sb.from('app_settings').upsert({ key: 'accoglienza', value: { ...conf, dal: new Date().toISOString() } });
    return;
  }

  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  if (!smtpConfigurato(smtp)) return;
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');

  const { data: contatti } = await sb.from('contacts')
    .select('id, email, name, confirmed_at')
    .eq('status', 'confirmed').eq('lang', 'it')
    .gte('confirmed_at', conf.dal)
    .order('confirmed_at', { ascending: true })
    .limit(50);
  if (!contatti?.length) return;

  const ids = contatti.map((c) => c.id);
  const { data: fatti } = await sb.from('contact_events')
    .select('contact_id, kind').in('contact_id', ids).like('kind', 'accoglienza_%');
  const { data: richieste } = await sb.from('messages')
    .select('contact_id').in('contact_id', ids);
  const conRichiesta = new Set((richieste ?? []).map((r) => r.contact_id));
  const giaInviati = new Map<string, number>();
  for (const e of fatti ?? []) {
    const n = Number(String(e.kind).replace('accoglienza_', ''));
    giaInviati.set(e.contact_id, Math.max(giaInviati.get(e.contact_id) ?? 0, n));
  }

  const adesso = Date.now();
  let inviate = 0;
  for (const c of contatti) {
    if (inviate >= 8) break; // pochi per giro: protegge l'account Gmail
    if (conRichiesta.has(c.id)) continue;
    const prossimo = giaInviati.get(c.id) ?? 0; // 0, 1, 2 = passi già inviati
    if (prossimo >= ACCOGLIENZA_GIORNI.length) continue;
    const giorni = (adesso - new Date(c.confirmed_at).getTime()) / 864e5;
    if (giorni < ACCOGLIENZA_GIORNI[prossimo]) continue;

    const link = await linkDisiscrizione(sb, c.id);
    const m = emailAccoglienza({ passo: prossimo, nome: c.name, linkDisiscrizione: link, sito });
    if (await inviaUna(smtp, c.email, { ...m, disiscrizione: link })) {
      await sb.from('contact_events').insert({
        contact_id: c.id, kind: `accoglienza_${prossimo + 1}`, source: 'accoglienza', lang: 'it', payload: {},
      });
      inviate++;
    }
  }
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

/* ============================================================
   Prenotazione del colloquio conoscitivo
   ------------------------------------------------------------
   GET  /api/slots?setting=online|studio   orari liberi
   POST /api/booking { t, azione, slot?, nota? }
        azione: stato | conferma | proponi | annulla
   Il token dice chi sta agendo: quello della persona o quello di Alberto.
   ============================================================ */

const STATI_ATTIVI = ['in_attesa', 'proposta', 'confermata'];

function linkPrenotazione(sito: ImpostazioniSito, token: string): string {
  return `${(sito.url || 'https://www.albertodelbove-psicologo.it').replace(/\/$/, '')}/prenotazione/?t=${token}`;
}

function datiPrenotazione(r: Record<string, string>): DatiPrenotazione {
  return {
    nome: r.name, email: r.email, telefono: r.phone,
    setting: r.setting === 'studio' ? 'studio' : 'online',
    quando: quandoLeggibile(r.slot_start, r.lang), slot_start: r.slot_start, slot_end: r.slot_end,
    meet: r.status === 'confermata' ? r.meet_link : null,
    inCalendario: !!r.google_event_id,
    lang: r.lang || 'it',
    quandoIt: quandoLeggibile(r.slot_start),
  };
}

/**
 * Porta la prenotazione nel Google Calendar di Alberto tramite lo script
 * (evento provvisorio, confermato con Meet, o cancellato) e salva
 * identificativo dell'evento e link Meet. Se lo script manca o non
 * risponde, restituisce la riga com'era: il resto del flusso va avanti.
 */
async function aggiornaCalendario(
  sb: ReturnType<typeof servizio>, conf: ImpostazioniCalendario, sito: ImpostazioniSito,
  r: Record<string, string>, tipo: 'provvisorio' | 'confermato' | 'cancella',
): Promise<Record<string, string>> {
  const esito = await sincronizzaEvento(conf, {
    azione: tipo === 'cancella' ? 'cancella' : 'salva',
    id: r.google_event_id,
    provvisorio: tipo === 'provvisorio',
    nome: r.name || r.email, email: r.email, telefono: r.phone,
    setting: r.setting === 'studio' ? 'studio' : 'online',
    inizio: r.slot_start, fine: r.slot_end,
    linkGestione: linkPrenotazione(sito, r.token_alberto),
  });
  if (!esito?.ok || tipo === 'cancella') return r;
  const patch: Record<string, string> = {};
  if (esito.id && esito.id !== r.google_event_id) patch.google_event_id = esito.id;
  if (esito.meet && esito.meet !== r.meet_link) patch.meet_link = esito.meet;
  if (!Object.keys(patch).length) return r;
  const { data } = await sb.from('bookings').update(patch).eq('id', r.id).select().single();
  return (data as Record<string, string>) ?? { ...r, ...patch };
}

async function liberiPer(
  sb: ReturnType<typeof servizio>, conf: ImpostazioniCalendario, setting: 'online' | 'studio', escludi?: string,
): Promise<string[]> {
  const giorni = Math.min(Math.max(conf.giorni_avanti || 21, 3), 60);
  const { data } = await sb.from('bookings').select('id, slot_start, slot_end')
    .in('status', STATI_ATTIVI).gte('slot_end', new Date().toISOString());
  const occupati: Intervallo[] = (data ?? []).filter((r) => r.id !== escludi)
    .map((r) => ({ inizio: Date.parse(r.slot_start), fine: Date.parse(r.slot_end) }));
  occupati.push(...await impegniCalendario(conf, Date.now() + (giorni + 1) * 864e5));
  return orariLiberi({ conf, setting, occupati });
}

async function slots(req: Request, origin: string | null): Promise<Response> {
  const setting = new URL(req.url).searchParams.get('setting') === 'studio' ? 'studio' : 'online';
  const sb = servizio();
  const conf = await leggiImpostazioni<ImpostazioniCalendario>(sb, 'calendario');
  return json({ ok: true, setting, slots: await liberiPer(sb, conf, setting) }, 200, origin);
}

async function booking(req: Request, origin: string | null): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false }, 405, origin);
  const b = await req.json().catch(() => ({}));
  const token = testo(b.t, 100);
  // Solo caratteri da token: il valore finisce in un filtro della query.
  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return json({ ok: false, errore: 'token' }, 400, origin);

  const sb = servizio();
  const impronta = await improntaChiamante(req, SALE);
  if (!await entroIlLimite(sb, `booking:${impronta}`, 60, 60)) {
    return json({ ok: false, errore: 'troppe richieste' }, 429, origin);
  }

  const { data: r } = await sb.from('bookings').select('*')
    .or(`token_persona.eq.${token},token_alberto.eq.${token}`).maybeSingle();
  // 200 e non 404: la pagina gestisce da sé il caso, senza errori in console.
  if (!r) return json({ ok: false, errore: 'non trovata' }, 200, origin);
  const ruolo: 'persona' | 'alberto' = r.token_alberto === token ? 'alberto' : 'persona';

  const conf = await leggiImpostazioni<ImpostazioniCalendario>(sb, 'calendario');
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  const azione = String(b.azione || 'stato');
  const nota = testo(b.nota, 1000);

  const risposta = async (riga: Record<string, string>) => {
    let messaggio: string | null = null;
    if (ruolo === 'alberto' && riga.message_id) {
      const { data: m } = await sb.from('messages').select('body, topics').eq('id', riga.message_id).maybeSingle();
      messaggio = [m?.topics?.length ? `Temi: ${m.topics.join(', ')}` : '', m?.body ?? ''].filter(Boolean).join('\n\n') || null;
    }
    return json({
      ok: true, ruolo, stato: riga.status, proposta_da: riga.proposed_by,
      lang: ruolo === 'persona' ? (riga.lang || 'it') : 'it',
      quando: quandoLeggibile(riga.slot_start, ruolo === 'persona' ? riga.lang : 'it'), slot_start: riga.slot_start, slot_end: riga.slot_end,
      setting: riga.setting, nome: ruolo === 'alberto' ? riga.name : null,
      email: ruolo === 'alberto' ? riga.email : null, telefono: ruolo === 'alberto' ? riga.phone : null,
      messaggio, nota: riga.note,
      meet: riga.status === 'confermata' ? riga.meet_link : null,
      presenza: !!riga.presenza_confermata_at,
      slots: riga.status === 'annullata' ? [] : await liberiPer(sb, conf, riga.setting === 'studio' ? 'studio' : 'online', riga.id),
    }, 200, origin);
  };

  if (azione === 'stato') return await risposta(r);
  if (r.status === 'annullata' && azione !== 'messaggio') return json({ ok: false, errore: 'annullata' }, 409, origin);

  const altro = ruolo === 'alberto' ? 'persona' : 'alberto';
  const aggiorna = async (patch: Record<string, unknown>) => {
    const { data } = await sb.from('bookings')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', r.id).select().single();
    return data as Record<string, string>;
  };
  const avvisaAltro = async (riga: Record<string, string>, evento: Parameters<typeof emailPrenotazione>[0]['evento']) => {
    const m = emailPrenotazione({
      per: altro, evento, p: datiPrenotazione(riga), nota,
      link: linkPrenotazione(sito, altro === 'alberto' ? riga.token_alberto : riga.token_persona), sito,
    });
    await inviaUna(smtp, altro === 'alberto' ? destinatarioAvvisi(smtp) : riga.email, m);
  };

  if (azione === 'conferma') {
    const puo = (ruolo === 'alberto' && r.status === 'in_attesa') ||
      (ruolo === 'persona' && r.status === 'proposta' && r.proposed_by === 'alberto');
    if (!puo) return json({ ok: false, errore: 'stato' }, 409, origin);
    const riga = await aggiornaCalendario(sb, conf, sito,
      await aggiorna({ status: 'confermata', note: nota ?? r.note }), 'confermato');
    // Entrambi ricevono la conferma con il link per il calendario.
    for (const per of ['persona', 'alberto'] as const) {
      const m = emailPrenotazione({
        per, evento: 'confermata', p: datiPrenotazione(riga), nota: per === 'persona' && ruolo === 'alberto' ? nota : null,
        link: linkPrenotazione(sito, per === 'alberto' ? riga.token_alberto : riga.token_persona), sito,
      });
      await inviaUna(smtp, per === 'alberto' ? destinatarioAvvisi(smtp) : riga.email, m);
    }
    return await risposta(riga);
  }

  if (azione === 'proponi') {
    const slot = testo(b.slot, 40);
    if (!slot || isNaN(Date.parse(slot))) return json({ ok: false, errore: 'slot' }, 400, origin);
    const inizio = new Date(slot).toISOString();
    const liberi = await liberiPer(sb, conf, r.setting === 'studio' ? 'studio' : 'online', r.id);
    if (!liberi.includes(inizio)) return json({ ok: false, errore: 'occupato' }, 409, origin);
    const riga = await aggiorna({
      slot_start: inizio,
      slot_end: new Date(Date.parse(inizio) + (Date.parse(r.slot_end) - Date.parse(r.slot_start))).toISOString(),
      status: ruolo === 'alberto' ? 'proposta' : 'in_attesa',
      proposed_by: ruolo,
      note: nota,
      reminder_sent_at: null,
      presenza_confermata_at: null,
    }).then((x) => aggiornaCalendario(sb, conf, sito, x, 'provvisorio'));
    await avvisaAltro(riga, ruolo === 'alberto' ? 'proposta' : 'nuovo_orario');
    return await risposta(riga);
  }

  // Un messaggio libero dalla pagina dell'appuntamento, in qualunque stato:
  // arriva ad Alberto per email e resta fra le richieste del pannello.
  if (azione === 'messaggio') {
    const corpo = testo(b.testo, 3000);
    if (!corpo) return json({ ok: false, errore: 'vuoto' }, 400, origin);
    if (ruolo === 'persona') {
      await sb.from('messages').insert({
        contact_id: r.contact_id, name: r.name, email: r.email, phone: r.phone,
        setting: r.setting === 'studio' ? 'In studio a Itri (LT)' : 'Online',
        topics: ['Messaggio dalla prenotazione'], body: corpo, lang: 'it',
      });
      await inviaUna(smtp, destinatarioAvvisi(smtp), emailPrenotazione({
        per: 'alberto', evento: 'messaggio', p: datiPrenotazione(r), nota: corpo,
        link: linkPrenotazione(sito, r.token_alberto), sito,
      }));
    }
    return await risposta(r);
  }

  // La persona conferma che ci sarà (facoltativo): Alberto riceve l'avviso.
  if (azione === 'presenza') {
    if (ruolo !== 'persona' || r.status !== 'confermata') return json({ ok: false, errore: 'stato' }, 409, origin);
    if (r.presenza_confermata_at) return await risposta(r);
    const riga = await aggiorna({ presenza_confermata_at: new Date().toISOString() });
    await avvisaAltro(riga, 'presenza');
    return await risposta(riga);
  }

  if (azione === 'annulla') {
    const riga = await aggiorna({ status: 'annullata', note: nota });
    await aggiornaCalendario(sb, conf, sito, riga, 'cancella');
    await avvisaAltro(riga, 'annullata');
    return await risposta(riga);
  }

  return json({ ok: false, errore: 'azione' }, 400, origin);
}

/* ============================================================
   Promemoria del giorno prima
   ------------------------------------------------------------
   Per ogni colloquio confermato che cade fra 1 e 24 ore, un'email alla
   persona con data, luogo o link Meet e il link per spostare o annullare.
   Parte una volta sola; se l'orario cambia, reminder_sent_at torna vuoto
   e il promemoria vale per il nuovo orario.
   ============================================================ */

async function promemoria(sb: ReturnType<typeof servizio>) {
  const adesso = Date.now();
  const { data } = await sb.from('bookings').select('*')
    .eq('status', 'confermata').is('reminder_sent_at', null)
    .gte('slot_start', new Date(adesso + 3600000).toISOString())
    .lte('slot_start', new Date(adesso + 24 * 3600000).toISOString())
    .limit(10);
  if (!data?.length) return;
  const smtp = await leggiImpostazioni<ImpostazioniSmtp>(sb, 'smtp');
  if (!smtpConfigurato(smtp)) return;
  const sito = await leggiImpostazioni<ImpostazioniSito>(sb, 'sito');
  for (const r of data) {
    const m = emailPrenotazione({
      per: 'persona', evento: 'promemoria', p: datiPrenotazione(r),
      link: linkPrenotazione(sito, r.token_persona), sito,
    });
    if (await inviaUna(smtp, r.email, m)) {
      await sb.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id);
    }
  }
}

/* ============================================================
   Un solo colloquio conoscitivo per persona
   ============================================================ */

/** Forma canonica di un indirizzo: senza +etichetta e, per Gmail, senza punti. */
function emailCanonica(email: string): string {
  const [utente, dominio = ''] = email.toLowerCase().trim().split('@');
  const base = utente.split('+')[0];
  const gmail = dominio === 'gmail.com' || dominio === 'googlemail.com';
  return `${gmail ? base.replace(/\./g, '') : base}@${gmail ? 'gmail.com' : dominio}`;
}

/** La prenotazione ancora attiva (in attesa, proposta o confermata) di un indirizzo, se c'è. */
async function prenotazioneAttiva(
  sb: ReturnType<typeof servizio>, email: string,
): Promise<Record<string, string> | null> {
  const cercata = emailCanonica(email);
  const { data } = await sb.from('bookings').select('*')
    .in('status', ['in_attesa', 'proposta', 'confermata'])
    .gte('slot_end', new Date().toISOString());
  return (data ?? []).find((r) => emailCanonica(String(r.email)) === cercata) ?? null;
}
