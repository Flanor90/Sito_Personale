// ============================================================
// Invio email via SMTP + modelli delle email automatiche
// ------------------------------------------------------------
// Le credenziali SMTP arrivano da app_settings, che il browser non può
// leggere: vivono solo qui dentro. Con Gmail servono host smtp.gmail.com,
// porta 465 e una "password per le app" (non la password dell'account).
// ============================================================

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import type { ImpostazioniSmtp, ImpostazioniSito } from './db.ts';
import { esc } from './util.ts';

export type Messaggio = {
  a: string;
  oggetto: string;
  html: string;
  testo: string;
  /** Header List-Unsubscribe: migliora la consegna e rispetta la legge. */
  disiscrizione?: string;
};

export class ErroreSmtp extends Error {}

/**
 * La libreria SMTP codifica uno spazio a fine riga come «=20» e poi codifica
 * anche il simbolo «=»: nel messaggio arrivava un «=20» visibile (per esempio
 * «Psicoterapeuta =20 Nuova richiesta»). Gli spazi a fine riga non servono a
 * niente, quindi li tolgo prima dell'invio.
 */
export function senzaSpaziFinali(testo: string): string {
  return testo.replace(/[ \t]+(?=\r?\n)/g, '').replace(/[ \t]+$/, '');
}

/**
 * L'oggetto con lettere accentate o trattini lunghi va codificato a mano.
 * La libreria SMTP (denomailer 1.6.0) lo codifica da sé in quoted-printable,
 * ma spezza le righe lunghe a metà della codifica: Gmail mostrava
 * «=?utf-8?Q?Richiesta primo colloquio =e2=80=94…». E se l'oggetto inizia
 * con «=?» lo ricodifica una seconda volta, rompendo l'intestazione.
 * Quindi: le prime parole senza accenti restano in chiaro (così l'oggetto
 * non inizia mai con «=?» e la libreria lo lascia com'è), il resto diventa
 * una serie di parole codificate in base64 (RFC 2047), corte e senza
 * caratteri spezzati a metà.
 */
export function oggettoMime(testo: string): string {
  if (/^[\x20-\x7e]*$/.test(testo)) return testo;
  const primo = testo.search(/[^\x20-\x7e]/);
  const inizioParola = testo.lastIndexOf(' ', primo) + 1;
  if (inizioParola === 0) {
    // Nessuna parola in chiaro davanti: tolgo gli accenti, meglio che rompere l'email.
    return testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '-');
  }
  const byte = new TextEncoder().encode(testo.slice(inizioParola));
  const parti: string[] = [];
  let i = 0;
  while (i < byte.length) {
    let j = Math.min(i + 42, byte.length);
    while (j < byte.length && (byte[j] & 0xc0) === 0x80) j--;
    parti.push(btoa(String.fromCharCode(...byte.slice(i, j))));
    i = j;
  }
  return testo.slice(0, inizioParola) + parti.map((p) => `=?UTF-8?B?${p}?=`).join(' ');
}

/** Verifica che ci sia tutto il necessario prima ancora di connettersi. */
export function smtpConfigurato(s: ImpostazioniSmtp): boolean {
  return Boolean(s.host && s.port && s.user && s.pass && s.from_email);
}

/**
 * Apre UNA connessione SMTP e restituisce una funzione per inviare più
 * messaggi sopra la stessa. Riaprire la connessione a ogni destinatario
 * è lento e con Gmail fa scattare i limiti anti-abuso.
 */
export async function connessione(s: ImpostazioniSmtp) {
  if (!smtpConfigurato(s)) {
    throw new ErroreSmtp('SMTP non configurato: mancano host, porta, utente, password o mittente.');
  }

  const client = new SMTPClient({
    connection: {
      hostname: s.host!,
      port: Number(s.port),
      tls: s.secure !== false,
      auth: { username: s.user!, password: s.pass! },
    },
  });

  const mittente = s.from_name ? `${s.from_name} <${s.from_email}>` : s.from_email!;

  return {
    async invia(m: Messaggio) {
      await client.send({
        from: mittente,
        to: m.a,
        replyTo: s.reply_to || s.from_email!,
        subject: oggettoMime(m.oggetto),
        content: senzaSpaziFinali(m.testo),
        html: senzaSpaziFinali(m.html),
        headers: m.disiscrizione
          ? {
            'List-Unsubscribe': `<${m.disiscrizione}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
          : undefined,
      });
    },
    async chiudi() {
      try {
        await client.close();
      } catch { /* la connessione può essere già caduta: non è un errore */ }
    },
  };
}

/* ============================================================
   Modello grafico delle email — coerente col brand del sito
   ============================================================ */

const CREMA = '#F7F5F1';
const NOTTE = '#1B2A3A';
const MIRTILLO = '#4C507F';
const INCHIOSTRO = '#2B2B2B';
const TORTORA = '#E4DFD8';

/**
 * Incornicia il contenuto. Volutamente a tabelle e con stili in linea:
 * è l'unico HTML che i client di posta (Outlook in testa) rendono uguale.
 */
export function cornice(opts: {
  contenuto: string;
  preheader?: string;
  sito: ImpostazioniSito;
  linkDisiscrizione?: string;
  testoDisiscrizione?: string;
}): string {
  const { contenuto, preheader, sito, linkDisiscrizione } = opts;
  const nomeSito = sito.nome || 'Alberto Del Bove — Psicologo Psicoterapeuta';
  const urlSito = sito.url || 'https://www.albertodelbove-psicologo.it';

  const piede = linkDisiscrizione
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b6b6b;">
         ${esc(opts.testoDisiscrizione || 'Non vuoi più ricevere queste email?')}
         <a href="${esc(linkDisiscrizione)}" style="color:#6b6b6b;text-decoration:underline;">Disiscriviti</a>.
       </p>`
    : '';

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(nomeSito)}</title></head>
<body style="margin:0;padding:0;background:${CREMA};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;
                  box-shadow:0 2px 14px rgba(27,42,58,.07);">
      <tr><td style="background:${NOTTE};padding:22px 28px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${CREMA};letter-spacing:.2px;">
          Alberto Del Bove
        </div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#A9ACD4;margin-top:3px;letter-spacing:.06em;text-transform:uppercase;">
          Psicologo Psicoterapeuta
        </div>
      </td></tr>
      <tr><td style="padding:30px 28px;font-family:Helvetica,Arial,sans-serif;
                     font-size:15px;line-height:1.68;color:${INCHIOSTRO};">
        ${contenuto}
      </td></tr>
      <tr><td style="padding:20px 28px 26px;border-top:1px solid ${TORTORA};
                     font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b6b6b;">
        <a href="${esc(urlSito)}" style="color:${MIRTILLO};text-decoration:none;font-weight:bold;">${esc(
    urlSito.replace(/^https?:\/\//, ''),
  )}</a>
        ${sito.firma ? `<p style="margin:8px 0 0;">${esc(sito.firma)}</p>` : ''}
        ${piede}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Bottone a prova di client di posta (niente CSS moderno). */
export function bottone(testo: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:10px;background:${MIRTILLO};">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;
         font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(testo)}</a>
    </td></tr></table>`;
}

/* ============================================================
   Email di conferma iscrizione (double opt-in)
   ------------------------------------------------------------
   Obbligatoria per il GDPR: l'iscrizione è valida solo dopo che la
   persona ha cliccato. Tradotta nelle tre lingue del sito.
   ============================================================ */

const TESTI: Record<string, {
  oggetto: string;
  titolo: string;
  corpo: string;
  cta: string;
  coda: string;
  ignora: string;
}> = {
  it: {
    oggetto: 'Conferma la tua iscrizione',
    titolo: 'Manca solo un passaggio',
    corpo:
      'Hai lasciato il tuo indirizzo sul mio sito. Per completare l’iscrizione — e per essere sicuro che sia davvero tu — clicca qui sotto.',
    cta: 'Confermo l’iscrizione',
    coda:
      'Ti scriverò di rado, su psicoterapia, ADHD, trauma e lavoro. Puoi disiscriverti quando vuoi, con un click, in fondo a ogni email.',
    ignora: 'Se non sei stato tu, ignora pure questo messaggio: senza il click qui sopra non succede nulla.',
  },
  en: {
    oggetto: 'Confirm your subscription',
    titolo: 'One last step',
    corpo:
      'You left your address on my website. To complete your subscription — and to make sure it is really you — please click below.',
    cta: 'Confirm my subscription',
    coda:
      'I write rarely, about psychotherapy, ADHD, trauma and work. You can unsubscribe at any time, with one click, at the bottom of every email.',
    ignora: 'If this was not you, simply ignore this message: without the click above, nothing happens.',
  },
  es: {
    oggetto: 'Confirma tu suscripción',
    titolo: 'Solo falta un paso',
    corpo:
      'Has dejado tu dirección en mi sitio web. Para completar la suscripción — y para asegurarme de que eres tú — haz clic abajo.',
    cta: 'Confirmo mi suscripción',
    coda:
      'Escribo pocas veces, sobre psicoterapia, TDAH, trauma y trabajo. Puedes darte de baja cuando quieras, con un clic, al final de cada email.',
    ignora: 'Si no has sido tú, ignora este mensaje: sin el clic de arriba no ocurre nada.',
  },
};

export function emailConferma(opts: {
  lang: string;
  linkConferma: string;
  sito: ImpostazioniSito;
}): { oggetto: string; html: string; testo: string } {
  const t = TESTI[opts.lang] ?? TESTI.it;

  const html = cornice({
    sito: opts.sito,
    preheader: t.corpo,
    contenuto: `
      <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:23px;
                 line-height:1.3;color:${NOTTE};font-weight:normal;">${esc(t.titolo)}</h1>
      <p style="margin:0 0 4px;">${esc(t.corpo)}</p>
      ${bottone(t.cta, opts.linkConferma)}
      <p style="margin:0 0 14px;">${esc(t.coda)}</p>
      <p style="margin:0;font-size:13px;color:#6b6b6b;">${esc(t.ignora)}</p>`,
  });

  const testo = `${t.titolo}\n\n${t.corpo}\n\n${opts.linkConferma}\n\n${t.coda}\n\n${t.ignora}`;
  return { oggetto: t.oggetto, html, testo };
}

/* ============================================================
   Consegna di un materiale gratuito (la guida in PDF)
   ------------------------------------------------------------
   La guida arriva per email, non con un download immediato. È una scelta
   deliberata: un indirizzo inventato non riceve niente, quindi chi lascia
   l'email lascia un indirizzo vero. Il prezzo da pagare è che la consegna
   dipende dall'SMTP — senza, la persona resterebbe a mani vuote, e per
   questo il sito mantiene una via di scorta.

   L'iscrizione alla newsletter resta una cosa separata: la guida è ciò che
   la persona ha chiesto e le spetta comunque; le uscite successive le
   riceve solo se conferma. Per questo il link di conferma è nel poscritto
   e non è una condizione per scaricare.
   ============================================================ */

export type Materiale = {
  titolo: string;
  descrizione?: string;
  url: string;
};

export function emailMateriale(opts: {
  materiale: Materiale;
  linkConferma?: string;
  sito: ImpostazioniSito;
}): { oggetto: string; html: string; testo: string } {
  const { materiale, linkConferma, sito } = opts;

  const poscritto = linkConferma
    ? `<div style="margin:28px 0 0;padding:18px 20px;background:${CREMA};border-radius:12px;">
         <p style="margin:0 0 6px;font-weight:bold;color:${NOTTE};">Un'ultima cosa</p>
         <p style="margin:0 0 12px;font-size:14px;">
           Se vuoi ricevere anche le prossime uscite, conferma l'iscrizione con un click.
           Se non lo fai, nessun problema: la guida è tua comunque e non ti scriverò più.
         </p>
         <a href="${esc(linkConferma)}" style="color:${MIRTILLO};font-weight:bold;font-size:14px;">
           Confermo l'iscrizione
         </a>
       </div>`
    : '';

  const html = cornice({
    sito,
    preheader: `La tua guida: ${materiale.titolo}`,
    contenuto: `
      <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:23px;
                 line-height:1.3;color:${NOTTE};font-weight:normal;">Ecco la tua guida</h1>
      <p style="margin:0 0 4px;"><strong>${esc(materiale.titolo)}</strong></p>
      ${materiale.descrizione ? `<p style="margin:8px 0 0;">${esc(materiale.descrizione)}</p>` : ''}
      ${bottone('Scarica la guida in PDF', materiale.url)}
      <p style="margin:0;font-size:13px;color:#6b6b6b;">
        Se il pulsante non funziona, copia questo indirizzo nel browser:<br>
        <span style="word-break:break-all;">${esc(materiale.url)}</span>
      </p>
      ${poscritto}
      <p style="margin:24px 0 0;font-size:14px;color:#6b6b6b;">
        Se leggendo ti viene voglia di parlarne con qualcuno, puoi scrivermi anche solo una riga
        <a href="${esc(waLink(WA_PRIMO_COLLOQUIO))}" style="color:${MIRTILLO};font-weight:bold;">su WhatsApp</a>
        o rispondendo a questa email.
      </p>`,
  });

  const testo = [
    'Ecco la tua guida',
    '',
    materiale.titolo,
    materiale.descrizione ?? '',
    '',
    `Scaricala qui: ${materiale.url}`,
    linkConferma
      ? `\n\nSe vuoi ricevere anche le prossime uscite, conferma l'iscrizione: ${linkConferma}\nSe non lo fai, la guida resta tua comunque e non ti scriverò più.`
      : '',
    `\nSe leggendo ti viene voglia di parlarne con qualcuno, puoi scrivermi su WhatsApp: ${waLink(WA_PRIMO_COLLOQUIO)}`,
  ].filter(Boolean).join('\n');

  return { oggetto: `La tua guida: ${materiale.titolo}`, html, testo };
}

/* ============================================================
   Notifica ad Alberto: è arrivata una richiesta di colloquio
   ============================================================ */

export function emailNotificaRichiesta(opts: {
  nome: string;
  email: string;
  telefono?: string | null;
  setting?: string | null;
  temi: string[];
  messaggio?: string | null;
  linkTrello?: string | null;
  sito: ImpostazioniSito;
  supervisione?: boolean;
  /** Se la persona ha scelto un orario dal calendario. */
  prenotazione?: { quando: string; dove: string; link: string; occupato?: boolean; gia?: boolean } | null;
}): { oggetto: string; html: string; testo: string } {
  const cosa = opts.supervisione ? 'Richiesta di supervisione' : 'Richiesta primo colloquio';
  const pr = opts.prenotazione;
  const riga = (etichetta: string, valore?: string | null) =>
    valore
      ? `<tr><td style="padding:5px 12px 5px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top;">${esc(etichetta)}</td>
           <td style="padding:5px 0;"><strong>${esc(valore)}</strong></td></tr>`
      : '';

  const html = cornice({
    sito: opts.sito,
    preheader: `${opts.nome} — ${opts.email}`,
    contenuto: `
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;
                 line-height:1.3;color:${NOTTE};font-weight:normal;">${opts.supervisione ? 'Nuova richiesta di supervisione' : 'Nuova richiesta di primo colloquio'}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
        ${riga('Nome', opts.nome)}
        ${riga('Email', opts.email)}
        ${riga('Telefono', opts.telefono)}
        ${riga('Setting', opts.setting)}
        ${riga('Temi', opts.temi.join(' · '))}
      </table>
      ${
      opts.messaggio
        ? `<div style="margin:20px 0 0;padding:16px 18px;background:${CREMA};border-radius:12px;
                       border-left:3px solid ${MIRTILLO};white-space:pre-wrap;">${esc(opts.messaggio)}</div>`
        : ''
    }
      ${pr ? `<div style="margin:20px 0 0;padding:16px 18px;background:#E2E4F1;border-radius:12px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">${pr.gia ? 'Ha già un colloquio conoscitivo prenotato' : 'Orario scelto'}</p>
          <p style="margin:0;font-size:17px;"><strong>${esc(pr.quando)}</strong>, ${esc(pr.dove)}</p>
          ${pr.occupato ? '<p style="margin:8px 0 0;font-size:13px;color:#9a3412;">Attenzione: nel frattempo questo orario risulta occupato. Proponine un altro.</p>' : ''}
          ${pr.gia ? '<p style="margin:8px 0 0;font-size:13px;color:#6b6b6b;">Ha provato a prenotare un secondo orario: non l’ho creato, ma il suo messaggio è qui sopra.</p>' : ''}
        </div>
        ${bottone(pr.gia ? 'Vedi l’appuntamento' : 'Conferma o proponi un altro orario', pr.link)}` : ''}
      ${opts.linkTrello ? bottone('Apri la scheda su Trello', opts.linkTrello) : ''}`,
  });

  const testo = [
    opts.supervisione ? 'Nuova richiesta di supervisione' : 'Nuova richiesta di primo colloquio',
    '',
    `Nome: ${opts.nome}`,
    `Email: ${opts.email}`,
    opts.telefono ? `Telefono: ${opts.telefono}` : '',
    opts.setting ? `Setting: ${opts.setting}` : '',
    opts.temi.length ? `Temi: ${opts.temi.join(' · ')}` : '',
    '',
    opts.messaggio ?? '',
    pr ? (pr.gia
      ? `\nHa già un colloquio conoscitivo: ${pr.quando}, ${pr.dove}. Non ho creato una seconda prenotazione.\nVedi l’appuntamento: ${pr.link}`
      : `\nOrario scelto: ${pr.quando}, ${pr.dove}${pr.occupato ? ' (risulta occupato: proponine un altro)' : ''}\nConferma o proponi: ${pr.link}`) : '',
    opts.linkTrello ? `\nTrello: ${opts.linkTrello}` : '',
  ].filter(Boolean).join('\n');

  return {
    oggetto: pr?.gia ? `Nuovo messaggio da ${opts.nome} (ha già un colloquio)` : `${cosa} — ${opts.nome}${pr ? ` — ${pr.quando}` : ''}`,
    html, testo,
  };
}

/* ============================================================
   Avvisi ad Alberto: tutto ciò che arriva dal sito
   ------------------------------------------------------------
   Iscrizioni, guide richieste, risultati dei test chiesti per email,
   test completati, messaggi WhatsApp preparati dal modulo. Una scheda
   semplice, con le righe che servono per capire chi e da dove.
   ============================================================ */

/**
 * Dove arrivano gli avvisi se nel pannello «Avvisi a» è vuoto. Non è la
 * casella che spedisce: Gmail segna come già lette le email che un account
 * manda a se stesso, e il telefono non suonerebbe.
 */
const AVVISI_PREDEFINITI = 'alberto.delbove@gmail.com';

/** A chi mandare gli avvisi: il campo del pannello, altrimenti il predefinito. */
export function destinatarioAvvisi(s: ImpostazioniSmtp): string | undefined {
  return s.notifiche_a || AVVISI_PREDEFINITI;
}

export function emailAvviso(opts: {
  titolo: string;
  righe: [string, string | null | undefined][];
  sito: ImpostazioniSito;
}): { oggetto: string; html: string; testo: string } {
  const piene = opts.righe.filter(([, v]) => v) as [string, string][];
  const html = cornice({
    sito: opts.sito,
    preheader: piene.map(([, v]) => v).slice(0, 2).join(' · '),
    contenuto: `
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;
                 line-height:1.3;color:${NOTTE};font-weight:normal;">${esc(opts.titolo)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
        ${piene.map(([e, v]) => `<tr><td style="padding:5px 12px 5px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top;">${esc(e)}</td>
           <td style="padding:5px 0;"><strong>${esc(v)}</strong></td></tr>`).join('')}
      </table>`,
  });
  const testo = [opts.titolo, '', ...piene.map(([e, v]) => `${e}: ${v}`)].join('\n');
  return { oggetto: opts.titolo, html, testo };
}

/**
 * Manda un'email singola. Non lancia mai: un'email persa non deve far
 * fallire la richiesta della persona. Restituisce true se è partita.
 */
export async function inviaUna(
  smtp: ImpostazioniSmtp,
  a: string | undefined,
  m: { oggetto: string; html: string; testo: string; disiscrizione?: string },
): Promise<boolean> {
  if (!smtpConfigurato(smtp) || !a) return false;
  try {
    const conn = await connessione(smtp);
    await conn.invia({ a, ...m });
    await conn.chiudi();
    return true;
  } catch (e) {
    console.error('[email]', a === destinatarioAvvisi(smtp) ? 'avviso' : 'persona', e);
    return false;
  }
}

/** Manda un avviso ad Alberto. */
export async function avvisa(
  smtp: ImpostazioniSmtp,
  m: { oggetto: string; html: string; testo: string },
): Promise<void> {
  await inviaUna(smtp, destinatarioAvvisi(smtp), m);
}

/* ============================================================
   Accoglienza: le email che ricevono le persone
   ------------------------------------------------------------
   Due flussi, separati per una ragione di consenso.

   1. Chi chiede un primo colloquio riceve subito una conferma: che cosa
      succede adesso e, se preferisce, WhatsApp. È la risposta alla sua
      richiesta, non promozione, quindi non serve il consenso newsletter.

   2. Chi conferma l'iscrizione alla newsletter riceve tre email nei primi
      giorni: un benvenuto, come si comincia in pratica, una domanda. Solo
      a chi ha dato e confermato il consenso, mai a chi ha già chiesto un
      colloquio, sempre con il link per disiscriversi. Dopo la terza,
      soltanto le uscite della newsletter.
   ============================================================ */

const WA_NUMERO = '393455032318';
const WA_PRIMO_COLLOQUIO =
  "Buongiorno Dott. Del Bove, ho ricevuto la sua email e vorrei capire se possiamo fissare un primo colloquio. Preferirei: online / in studio a Itri";

export function waLink(testo: string): string {
  return `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(testo)}`;
}

function saluto(nome: string | null | undefined, ciao = 'Ciao'): string {
  const n = (nome || '').trim().split(/\s+/)[0];
  return n ? `${ciao} ${n},` : `${ciao},`;
}

function titolo(t: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:23px;
                 line-height:1.3;color:${NOTTE};font-weight:normal;">${esc(t)}</h1>`;
}

function par(t: string): string {
  return `<p style="margin:0 0 14px;">${esc(t)}</p>`;
}

function linkSecondario(testo: string, href: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;"><a href="${esc(href)}" style="color:${MIRTILLO};font-weight:bold;">${esc(testo)}</a></p>`;
}

/* ---------- 1. Conferma della richiesta di colloquio ---------- */

const RICHIESTA: Record<string, {
  oggetto: string; ciao: string; titolo: string; apertura: string; passi: string[];
  wa: string; waTesto: string; waMessaggio: string; chiusura: string; firma: string;
}> = {
  it: {
    oggetto: 'Ho ricevuto la tua richiesta',
    ciao: 'Ciao',
    titolo: 'Ho ricevuto la tua richiesta',
    apertura: 'grazie per avermi scritto. Ecco che cosa succede adesso, così sai cosa aspettarti.',
    passi: [
      'Ti rispondo io, di solito entro poche ore, per confermare l’orario che hai proposto o sceglierne un altro.',
      'Ci incontriamo per 45 minuti, online o nello studio di Itri, per capire insieme che cosa ti porta.',
      'Alla fine decidi tu se e come continuare, senza impegno.',
    ],
    wa: 'Se preferisci fare prima, puoi scrivermi direttamente su WhatsApp.',
    waTesto: 'Scrivimi su WhatsApp',
    waMessaggio: 'Buongiorno Dott. Del Bove, le ho appena inviato una richiesta di primo colloquio dal sito.',
    chiusura: 'Puoi anche rispondere a questa email. Quello che mi scrivi resta coperto dal segreto professionale.',
    firma: 'A presto,\nAlberto Del Bove',
  },
  en: {
    oggetto: 'I have received your request',
    ciao: 'Hello',
    titolo: 'I have received your request',
    apertura: 'thank you for writing to me. Here is what happens next, so you know what to expect.',
    passi: [
      'I will reply myself, usually within a few hours, to confirm the time you suggested or find another one.',
      'We meet for 45 minutes, online or at my practice in Itri, to understand together what brings you.',
      'At the end you decide whether and how to continue, with no commitment.',
    ],
    wa: 'If you prefer to be quicker, you can write to me directly on WhatsApp.',
    waTesto: 'Write to me on WhatsApp',
    waMessaggio: 'Good morning Dr. Del Bove, I have just sent you a request for a first session through the website.',
    chiusura: 'You can also reply to this email. Whatever you write is covered by professional confidentiality.',
    firma: 'Best wishes,\nAlberto Del Bove',
  },
  supervisione: {
    oggetto: 'Ho ricevuto la tua richiesta di supervisione',
    ciao: 'Ciao',
    titolo: 'Ho ricevuto la tua richiesta di supervisione',
    apertura: 'grazie per avermi scritto. Ecco come proseguiamo.',
    passi: [
      'Ti rispondo io, di solito entro un giorno lavorativo.',
      'Ci sentiamo per un primo incontro, online o in studio a Itri, per capire che cosa ti serve: un caso, un percorso continuativo o un lavoro con l’équipe.',
      'Onorario e cadenza li concordiamo prima di cominciare.',
    ],
    wa: 'Se preferisci, puoi scrivermi anche su WhatsApp.',
    waTesto: 'Scrivimi su WhatsApp',
    waMessaggio: 'Buongiorno Dott. Del Bove, le ho appena scritto dal sito per una supervisione clinica.',
    chiusura: 'Ti chiedo solo di non mandarmi per email o su WhatsApp dati che rendano riconoscibili i pazienti: del caso parliamo in supervisione.',
    firma: 'A presto,\nAlberto Del Bove',
  },
  es: {
    oggetto: 'He recibido tu solicitud',
    ciao: 'Hola',
    titolo: 'He recibido tu solicitud',
    apertura: 'gracias por escribirme. Esto es lo que pasa ahora, para que sepas qué esperar.',
    passi: [
      'Te respondo yo, normalmente en pocas horas, para confirmar el horario que propusiste o elegir otro.',
      'Nos vemos 45 minutos, online o en mi consulta de Itri, para entender juntos qué te trae.',
      'Al final decides tú si continuar y cómo, sin compromiso.',
    ],
    wa: 'Si prefieres ir más rápido, puedes escribirme directamente por WhatsApp.',
    waTesto: 'Escríbeme por WhatsApp',
    waMessaggio: 'Buenos días, Dr. Del Bove: le acabo de enviar una solicitud de primera sesión desde la web.',
    chiusura: 'También puedes responder a este email. Lo que me escribas está protegido por el secreto profesional.',
    firma: 'Un saludo,\nAlberto Del Bove',
  },
};

export function emailRicevutaRichiesta(opts: {
  nome?: string | null; lang: string; sito: ImpostazioniSito; supervisione?: boolean;
}): { oggetto: string; html: string; testo: string } {
  const t = opts.supervisione ? RICHIESTA.supervisione : (RICHIESTA[opts.lang] ?? RICHIESTA.it);
  const wa = waLink(t.waMessaggio);
  const html = cornice({
    sito: opts.sito,
    preheader: t.apertura,
    contenuto: `
      ${titolo(t.titolo)}
      ${par(`${saluto(opts.nome, t.ciao)} ${t.apertura}`)}
      <ol style="margin:0 0 18px;padding-left:20px;">
        ${t.passi.map((p) => `<li style="margin:0 0 8px;">${esc(p)}</li>`).join('')}
      </ol>
      ${par(t.wa)}
      ${bottone(t.waTesto, wa)}
      ${par(t.chiusura)}
      <p style="margin:0;white-space:pre-line;">${esc(t.firma)}</p>`,
  });
  const testo = [
    `${saluto(opts.nome, t.ciao)} ${t.apertura}`, '',
    ...t.passi.map((p, i) => `${i + 1}. ${p}`), '',
    `${t.wa} ${wa}`, '', t.chiusura, '', t.firma,
  ].join('\n');
  return { oggetto: t.oggetto, html, testo };
}

/* ---------- 2. Benvenuto in tre passi per chi si iscrive ---------- */

/** Giorni dopo la conferma dell'iscrizione in cui parte ciascun passo. */
export const ACCOGLIENZA_GIORNI = [0, 3, 8];

export function emailAccoglienza(opts: {
  passo: number; nome?: string | null; linkDisiscrizione: string; sito: ImpostazioniSito;
}): { oggetto: string; html: string; testo: string } {
  const url = (opts.sito.url || 'https://www.albertodelbove-psicologo.it').replace(/\/$/, '');
  const wa = waLink(WA_PRIMO_COLLOQUIO);
  const firma = 'A presto,\nAlberto';

  const passi = [
    {
      oggetto: 'Grazie di essere qui',
      titolo: 'Grazie di essere qui',
      righe: [
        'grazie per aver confermato l’iscrizione. Ti scriverò di rado, quando ho qualcosa da dire su psicoterapia, ansia, lavoro, relazioni e vita all’estero.',
        'Se vuoi cominciare da qualcosa, sul sito trovi gli articoli e alcuni test di auto-osservazione. Non danno diagnosi, ma possono aiutarti a mettere a fuoco una domanda.',
      ],
      bottone: ['Leggi gli articoli', `${url}/articoli/`],
      dopo: 'E se a un certo punto ti venisse voglia di parlarne con qualcuno, puoi scrivermi anche solo una riga, su WhatsApp o rispondendo a questa email.',
      secondario: ['Scrivimi su WhatsApp', wa],
    },
    {
      oggetto: 'Come si comincia, in pratica',
      titolo: 'Come si comincia, in pratica',
      righe: [
        'molte persone mi raccontano che la parte più difficile è stata scrivere il primo messaggio. Per questo provo a dirti come funziona, così sai che cosa aspettarti.',
        'Si comincia da un colloquio conoscitivo di 45 minuti, online oppure nello studio di Itri (LT). Serve a capire insieme che cosa ti sta succedendo e se un percorso può esserti utile. Alla fine decidi tu se e come continuare, senza impegno.',
        'Per fissarlo basta un messaggio su WhatsApp, anche breve. Ti rispondo io, di solito in giornata.',
      ],
      bottone: ['Scrivimi su WhatsApp', wa],
      dopo: '',
      secondario: ['Oppure prenota dal sito', `${url}/#contatti`],
    },
    {
      oggetto: 'Una domanda, se ti va',
      titolo: 'Una domanda, se ti va',
      righe: [
        'questa è l’ultima email di questo tipo. Da qui in avanti riceverai soltanto le uscite della newsletter.',
        'Volevo farti una domanda semplice: che cosa ti ha portato sul mio sito? Rispondere non è obbligatorio. Ma se ti va di raccontarmelo, anche in due righe, puoi rispondere a questa email o scrivermi su WhatsApp. Leggo tutto io, e quello che mi scrivi resta coperto dal segreto professionale.',
        'Se invece adesso non è il momento, va bene così. Puoi scrivermi quando vuoi.',
      ],
      bottone: ['Scrivimi su WhatsApp', wa],
      dopo: '',
      secondario: null as null | string[],
    },
  ];
  const p = passi[Math.max(0, Math.min(opts.passo, passi.length - 1))];
  const [primo, ...altri] = p.righe;

  const html = cornice({
    sito: opts.sito,
    preheader: primo,
    linkDisiscrizione: opts.linkDisiscrizione,
    contenuto: `
      ${titolo(p.titolo)}
      ${par(`${saluto(opts.nome)} ${primo}`)}
      ${altri.map(par).join('')}
      ${bottone(p.bottone[0], p.bottone[1])}
      ${p.dopo ? par(p.dopo) : ''}
      ${p.secondario ? linkSecondario(p.secondario[0], p.secondario[1]) : ''}
      <p style="margin:0;white-space:pre-line;">${esc(firma)}</p>`,
  });
  const testo = [
    `${saluto(opts.nome)} ${primo}`, ...altri, '',
    `${p.bottone[0]}: ${p.bottone[1]}`,
    p.dopo, p.secondario ? `${p.secondario[0]}: ${p.secondario[1]}` : '',
    '', firma, '', `Per non ricevere più queste email: ${opts.linkDisiscrizione}`,
  ].filter((r, i, a) => r !== '' || a[i - 1] !== '').join('\n');
  return { oggetto: p.oggetto, html, testo };
}

/* ============================================================
   Prenotazione del colloquio conoscitivo
   ------------------------------------------------------------
   La persona sceglie un orario, Alberto conferma o ne propone un altro,
   la persona accetta o ne sceglie un altro ancora. Ogni email porta alla
   pagina /prenotazione/ del sito con il proprio link personale: lì si
   conferma, si cambia orario o si annulla. Nelle email nessun pulsante
   agisce da solo, perché i filtri antispam aprono i link per controllarli
   e confermerebbero al posto delle persone.
   ============================================================ */

export type DatiPrenotazione = {
  nome?: string | null;
  email: string;
  telefono?: string | null;
  setting: 'online' | 'studio';
  quando: string;
  slot_start: string;
  slot_end: string;
  /** Link Google Meet, per l'online confermato, se lo script l'ha creato. */
  meet?: string | null;
  /** L'evento è già nel Google Calendar di Alberto (creato dallo script). */
  inCalendario?: boolean;
  /** Lingua della persona (it, en, es): le sue email la seguono. */
  lang?: string;
  /** La data in italiano, per le email ad Alberto. */
  quandoIt?: string;
};

/* ---------- Le email della persona in inglese e spagnolo ---------- */

type TestoPren = {
  oggetto: string; titolo: string; righe: string[]; bottone: [string, string];
  secondario?: [string, string]; meet?: boolean;
};

const ESTERO: Record<'en' | 'es', {
  firma: string; ciao: string; dove: (s: string) => string; online: (meet: boolean) => string; studio: string;
  cortesia: string; presenza: string; scrivimi: string; gestisci: string; wa: string; waMsg: (q: string) => string;
  linkVideo: string; gcal: string; spostaAnnulla: string; confermaSposta: string; nuovo: string;
  ricevuta: [string, string, string, string]; proposta: [string, string, string, string]; rispondi: string;
  confermata: [string, string, string]; annullata: [string, string, string, string];
  promemoria: [string, string, string]; gia: [string, string, string, string];
}> = {
  en: {
    firma: 'Best wishes,\nAlberto Del Bove', ciao: 'Hello',
    dove: (s) => s === 'studio' ? 'at my practice in Itri, Via Luigi Pirandello 8' : 'online, by video call',
    online: (meet) => meet
      ? 'We meet on Google Meet: at the time of the session just open the link below, from your computer or phone, somewhere quiet where nobody can hear you.'
      : 'A few minutes before, I will send you the video call link. All you need is a quiet place where nobody can hear you and a stable connection.',
    studio: 'My practice is at Via Luigi Pirandello 8, in Itri (LT), and parking nearby is easy.',
    cortesia: 'If you cannot make it, please move or cancel it from the link below, ideally by the day before: that time could help someone else.',
    presenza: 'From the same page you can also let me know you will be there: it is optional, but it helps me plan.',
    scrivimi: 'If you would like to tell me something before we meet, even just a couple of lines about what brings you, you can reply to this email or write to me from the appointment page. I read everything myself.',
    gestisci: 'Manage your appointment', wa: 'Or write to me on WhatsApp',
    waMsg: (q) => `Hello Dr. Del Bove, I am writing about the session on ${q}.`,
    linkVideo: 'Video call link', gcal: 'Add to Google Calendar', spostaAnnulla: 'Change time or cancel',
    confermaSposta: 'Confirm, move or cancel', nuovo: 'Choose a new time',
    ricevuta: ['I have received your request for', 'I have received your request', 'you asked for an introductory session on',
      'I will confirm it myself, usually within a few hours: you will get another email. If I cannot guarantee that time, I will suggest one close to it.'],
    proposta: ['I suggest another time:', 'I suggest another time', 'I cannot guarantee the time you chose. I suggest',
      'If it works for you, confirm it with one click. Otherwise you can choose another free time.'],
    rispondi: 'Reply to the proposal',
    confermata: ['Confirmed:', 'Your session is confirmed', 'our introductory session is confirmed for'],
    annullata: ['Session cancelled:', 'Your session is cancelled', 'the session on', 'is cancelled. If you would like to book another one, you can choose it on the website whenever you like, or write to me.'],
    promemoria: ['Reminder:', 'See you tomorrow', 'a reminder of our introductory session on'],
    gia: ['I have received your message', 'I have received your message', 'thank you for writing: I will read your message myself and reply personally.',
      'Your introductory session is still booked for'],
  },
  es: {
    firma: 'Un saludo,\nAlberto Del Bove', ciao: 'Hola',
    dove: (s) => s === 'studio' ? 'en mi consulta de Itri, via Luigi Pirandello 8' : 'online, por videollamada',
    online: (meet) => meet
      ? 'Nos vemos en Google Meet: a la hora de la cita basta con abrir el enlace de abajo, desde el ordenador o el móvil, en un lugar tranquilo donde nadie te oiga.'
      : 'Unos minutos antes te mando el enlace de la videollamada. Solo necesitas un lugar tranquilo, donde nadie te oiga, y una conexión estable.',
    studio: 'La consulta está en via Luigi Pirandello 8, en Itri (LT), y es fácil aparcar cerca.',
    cortesia: 'Si no puedes venir, cámbiala o anúlala desde el enlace de abajo, a ser posible el día antes: ese horario puede servirle a otra persona.',
    presenza: 'Desde la misma página también puedes confirmarme que vendrás: no es obligatorio, pero me ayuda a organizarme.',
    scrivimi: 'Si antes de la sesión quieres contarme algo, aunque sean dos líneas sobre lo que te trae, puedes responder a este email o escribirme desde la página de la cita. Lo leo todo yo.',
    gestisci: 'Gestiona tu cita', wa: 'O escríbeme por WhatsApp',
    waMsg: (q) => `Buenos días, Dr. Del Bove: le escribo por la sesión del ${q}.`,
    linkVideo: 'Enlace de la videollamada', gcal: 'Añadir a Google Calendar', spostaAnnulla: 'Cambiar horario o anular',
    confermaSposta: 'Confirmar, cambiar o anular', nuovo: 'Elige un nuevo horario',
    ricevuta: ['He recibido tu solicitud para el', 'He recibido tu solicitud', 'has pedido una sesión de conocimiento para el',
      'Te la confirmo yo, normalmente en pocas horas: te llegará otro email. Si no puedo garantizarte ese horario, te propongo uno cercano.'],
    proposta: ['Te propongo otro horario:', 'Te propongo otro horario', 'no puedo garantizarte el horario que elegiste. Te propongo el',
      'Si te va bien, confírmalo con un clic. Si no, puedes elegir otro horario libre.'],
    rispondi: 'Responder a la propuesta',
    confermata: ['Confirmada:', 'La sesión está confirmada', 'nuestra sesión de conocimiento está confirmada para el'],
    annullata: ['Sesión anulada:', 'La sesión está anulada', 'la sesión del', 'está anulada. Si quieres reservar otra, puedes elegirla en la web cuando quieras, o escribirme.'],
    promemoria: ['Recordatorio:', 'Nos vemos mañana', 'te recuerdo nuestra sesión de conocimiento del'],
    gia: ['He recibido tu mensaje', 'He recibido tu mensaje', 'gracias por escribirme: leo yo tu mensaje y te respondo personalmente.',
      'Tu sesión de conocimiento sigue reservada para el'],
  },
};

function testiEstero(lang: 'en' | 'es', evento: string, p: DatiPrenotazione, link: string, url: string): TestoPren | null {
  const L = ESTERO[lang];
  const n = (p.nome || '').trim().split(/\s+/)[0];
  const ciao = n ? `${L.ciao} ${n},` : `${L.ciao},`;
  const wa = waLink(L.waMsg(p.quando));
  const luogo = p.setting === 'online' ? L.online(!!p.meet) : L.studio;
  const gcal = linkGoogleCalendar(p, 'persona');
  switch (evento) {
    case 'ricevuta': return {
      oggetto: `${L.ricevuta[0]} ${p.quando}`, titolo: L.ricevuta[1],
      righe: [`${ciao} ${L.ricevuta[2]} ${p.quando}, ${L.dove(p.setting)}.`, L.ricevuta[3], L.scrivimi],
      bottone: [L.gestisci, link], secondario: [L.wa, wa],
    };
    case 'proposta': return {
      oggetto: `${L.proposta[0]} ${p.quando}`, titolo: L.proposta[1],
      righe: [`${ciao} ${L.proposta[2]} ${p.quando}, ${L.dove(p.setting)}.`, L.proposta[3]],
      bottone: [L.rispondi, link], secondario: [L.wa, wa],
    };
    case 'confermata': return {
      oggetto: `${L.confermata[0]} ${p.quando}`, titolo: L.confermata[1],
      righe: [`${ciao} ${L.confermata[2]} ${p.quando}, ${L.dove(p.setting)}.`, luogo, L.cortesia, L.presenza],
      bottone: [L.confermaSposta, `${link}&a=presenza`], secondario: [L.gcal, gcal], meet: true,
    };
    case 'promemoria': return {
      oggetto: `${L.promemoria[0]} ${p.quando}`, titolo: L.promemoria[1],
      righe: [`${ciao} ${L.promemoria[2]} ${p.quando}, ${L.dove(p.setting)}.`, luogo, L.cortesia, L.presenza],
      bottone: [L.confermaSposta, `${link}&a=presenza`], secondario: [L.wa, wa], meet: true,
    };
    case 'annullata': return {
      oggetto: `${L.annullata[0]} ${p.quando}`, titolo: L.annullata[1],
      righe: [`${ciao} ${L.annullata[2]} ${p.quando} ${L.annullata[3]}`],
      bottone: [L.nuovo, `${url}/?lang=${lang}#contatti`], secondario: [L.wa, wa],
    };
    case 'gia_prenotato': return {
      oggetto: L.gia[0], titolo: L.gia[1],
      righe: [`${ciao} ${L.gia[2]}`, `${L.gia[3]} ${p.quando}, ${L.dove(p.setting)}.`],
      bottone: [L.gestisci, link], secondario: [L.wa, wa],
    };
  }
  return null;
}

const CORTESIA = 'Se non riesci a esserci, spostalo o annullalo dal link qui sotto, possibilmente entro il giorno prima: quell’orario può servire a qualcun altro.';
const PRESENZA = 'Dalla stessa pagina puoi anche confermarmi che ci sarai: non è obbligatorio, ma mi aiuta a organizzarmi.';
const SCRIVIMI = 'Se prima del colloquio vuoi dirmi qualcosa, anche solo due righe su cosa ti porta, puoi rispondere a questa email o scrivermi dalla pagina dell’appuntamento. Leggo tutto io.';

function dove(setting: string): string {
  return setting === 'studio' ? 'nello studio di Itri, in via Luigi Pirandello 8' : 'online, in videochiamata';
}

function aaaammgg(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function linkGoogleCalendar(p: DatiPrenotazione, per: 'persona' | 'alberto'): string {
  const titolo = per === 'persona'
    ? (p.lang === 'en' ? 'Introductory session with Dr Alberto Del Bove'
      : p.lang === 'es' ? 'Sesión de conocimiento con el Dr. Alberto Del Bove'
      : 'Colloquio conoscitivo con il Dott. Alberto Del Bove')
    : `Colloquio conoscitivo: ${p.nome || p.email}`;
  const dettagli = per === 'persona'
    ? (p.setting === 'online'
      ? (p.meet ? `Videochiamata: ${p.meet}` : 'Il link per la videochiamata arriva prima dell’incontro.')
      : 'Studio: via Luigi Pirandello 8, Itri (LT).')
    : `${p.email}${p.telefono ? ' · ' + p.telefono : ''}`;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: titolo,
    dates: `${aaaammgg(p.slot_start)}/${aaaammgg(p.slot_end)}`,
    details: dettagli,
    location: p.setting === 'studio' ? 'Via Luigi Pirandello 8, 04020 Itri LT' : 'Online',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function emailPrenotazione(opts: {
  per: 'persona' | 'alberto';
  evento: 'ricevuta' | 'proposta' | 'nuovo_orario' | 'confermata' | 'annullata' | 'promemoria' | 'presenza'
    | 'gia_prenotato' | 'messaggio';
  p: DatiPrenotazione;
  link: string;
  nota?: string | null;
  sito: ImpostazioniSito;
}): { oggetto: string; html: string; testo: string } {
  const { per, evento, link, nota, sito } = opts;
  // Ad Alberto la data arriva sempre in italiano, qualunque sia la lingua della persona.
  const p = per === 'alberto' && opts.p.quandoIt ? { ...opts.p, quando: opts.p.quandoIt } : opts.p;
  const url = (sito.url || 'https://www.albertodelbove-psicologo.it').replace(/\/$/, '');
  const chi = p.nome || p.email;
  const ciao = saluto(p.nome);
  const estero = per === 'persona' && (p.lang === 'en' || p.lang === 'es') ? p.lang : null;
  const firma = estero ? ESTERO[estero].firma : 'A presto,\nAlberto Del Bove';
  const wa = waLink(`Buongiorno Dott. Del Bove, le scrivo per il colloquio di ${p.quando}.`);

  type Testo = {
    oggetto: string; titolo: string; righe: string[]; bottone: [string, string];
    secondario?: [string, string]; meet?: boolean;
  };
  const vuoto: Testo = { oggetto: '', titolo: '', righe: [], bottone: ['', ''] };
  const comeOnline = p.meet
    ? 'Ci vediamo su Google Meet: all’ora dell’appuntamento ti basta aprire il link qui sotto, dal computer o dal telefono, da un posto tranquillo dove nessuno ti senta.'
    : 'Qualche minuto prima ti mando il link per la videochiamata. Ti basta un posto tranquillo, dove nessuno ti senta, e una connessione stabile.';
  let t: Testo;
  const tEstero = estero ? testiEstero(estero, evento, p, link, url) : null;

  if (tEstero) {
    t = tEstero;
  } else if (per === 'persona') {
    t = {
      ricevuta: {
        oggetto: `Ho ricevuto la tua richiesta per ${p.quando}`,
        titolo: 'Ho ricevuto la tua richiesta',
        righe: [
          `${ciao} hai chiesto un colloquio conoscitivo per ${p.quando}, ${dove(p.setting)}.`,
          'Te lo confermo io, di solito entro poche ore: ti arriva un’altra email. Se quell’orario non riesco a garantirtelo, te ne propongo uno vicino.',
          SCRIVIMI,
          'Se nel frattempo devi cambiare orario o annullare, puoi farlo da qui.',
        ],
        bottone: ['Gestisci l’appuntamento', link] as [string, string],
        secondario: ['Oppure scrivimi su WhatsApp', wa] as [string, string],
      },
      gia_prenotato: {
        oggetto: 'Ho ricevuto il tuo messaggio',
        titolo: 'Ho ricevuto il tuo messaggio',
        righe: [
          `${ciao} grazie per avermi scritto: leggo io il tuo messaggio e ti rispondo personalmente.`,
          `Il tuo colloquio conoscitivo resta fissato per ${p.quando}, ${dove(p.setting)}. Il colloquio conoscitivo è uno per persona, ma se l’orario non ti va più bene puoi spostarlo da qui, oppure scrivermi: ne troviamo uno insieme.`,
        ],
        bottone: ['Gestisci l’appuntamento', link] as [string, string],
        secondario: ['Oppure scrivimi su WhatsApp', wa] as [string, string],
      },
      proposta: {
        oggetto: `Ti propongo un altro orario: ${p.quando}`,
        titolo: 'Ti propongo un altro orario',
        righe: [
          `${ciao} l’orario che avevi scelto non riesco a garantirtelo. Ti propongo ${p.quando}, ${dove(p.setting)}.`,
          'Se ti va bene, confermalo con un click. Altrimenti puoi sceglierne un altro tra quelli liberi.',
        ],
        bottone: ['Rispondi alla proposta', link] as [string, string],
        secondario: ['Oppure scrivimi su WhatsApp', wa] as [string, string],
      },
      confermata: {
        oggetto: `Confermato: ${p.quando}`,
        titolo: 'Il colloquio è confermato',
        righe: [
          `${ciao} il nostro colloquio conoscitivo è confermato per ${p.quando}, ${dove(p.setting)}.`,
          p.setting === 'online' ? comeOnline : 'Lo studio è in via Luigi Pirandello 8, a Itri (LT), e in zona si parcheggia facilmente.',
          CORTESIA,
          PRESENZA,
        ],
        bottone: ['Conferma, sposta o annulla', `${link}&a=presenza`] as [string, string],
        secondario: ['Aggiungi a Google Calendar', linkGoogleCalendar(p, 'persona')] as [string, string],
        meet: true,
      },
      promemoria: {
        oggetto: `Promemoria: ${p.quando}`,
        titolo: 'Ci vediamo domani',
        righe: [
          `${ciao} ti ricordo il nostro colloquio conoscitivo di ${p.quando}, ${dove(p.setting)}.`,
          p.setting === 'online' ? comeOnline : 'Lo studio è in via Luigi Pirandello 8, a Itri (LT), e in zona si parcheggia facilmente.',
          CORTESIA,
          PRESENZA,
        ],
        bottone: ['Conferma, sposta o annulla', `${link}&a=presenza`] as [string, string],
        secondario: ['Oppure scrivimi su WhatsApp', wa] as [string, string],
        meet: true,
      },
      annullata: {
        oggetto: `Colloquio annullato: ${p.quando}`,
        titolo: 'Il colloquio è annullato',
        righe: [
          `${ciao} il colloquio di ${p.quando} è annullato.`,
          'Se vuoi fissarne un altro, puoi sceglierlo dal sito quando vuoi, oppure scrivermi.',
        ],
        bottone: ['Scegli un nuovo orario', `${url}/#contatti`] as [string, string],
        secondario: ['Oppure scrivimi su WhatsApp', wa] as [string, string],
      },
      nuovo_orario: vuoto,
      presenza: vuoto,
      messaggio: vuoto,
    }[evento];
  } else {
    t = {
      ricevuta: vuoto,
      promemoria: vuoto,
      gia_prenotato: vuoto,
      messaggio: {
        oggetto: `Messaggio da ${chi} (colloquio di ${p.quando})`,
        titolo: 'Un messaggio per te',
        righe: [`${chi} ti ha scritto dalla pagina del suo appuntamento (${p.quando}, ${dove(p.setting)}).`, `Rispondi a: ${p.email}`],
        bottone: ['Vedi l’appuntamento', link] as [string, string],
      },
      presenza: {
        oggetto: `Presenza confermata: ${chi}, ${p.quando}`,
        titolo: 'Ci sarà',
        righe: [`${chi} ha confermato che ci sarà al colloquio di ${p.quando}, ${dove(p.setting)}.`],
        bottone: ['Vedi l’appuntamento', link] as [string, string],
      },
      nuovo_orario: {
        oggetto: `${chi} propone un altro orario: ${p.quando}`,
        titolo: 'Nuovo orario proposto',
        righe: [`${chi} ha scelto ${p.quando}, ${dove(p.setting)}.`, 'Confermalo o proponi un altro orario.'],
        bottone: ['Conferma o proponi un altro orario', link] as [string, string],
      },
      proposta: vuoto,
      confermata: {
        oggetto: `Confermato: ${chi}, ${p.quando}`,
        titolo: 'Colloquio confermato',
        righe: [
          `Colloquio conoscitivo con ${chi} confermato per ${p.quando}, ${dove(p.setting)}.`,
          `Email: ${p.email}${p.telefono ? ` · Telefono: ${p.telefono}` : ''}`,
          p.inCalendario
            ? `È già nel tuo Google Calendar${p.meet ? ', con il link Meet, che la persona ha ricevuto nell’email di conferma' : ''}.`
            : 'Non è ancora nel tuo calendario: aggiungilo con il pulsante qui sotto.',
        ],
        bottone: p.inCalendario
          ? ['Gestisci l’appuntamento', link] as [string, string]
          : ['Aggiungi a Google Calendar', linkGoogleCalendar(p, 'alberto')] as [string, string],
        secondario: p.inCalendario ? undefined : ['Gestisci l’appuntamento', link] as [string, string],
      },
      annullata: {
        oggetto: `Annullato: ${chi}, ${p.quando}`,
        titolo: 'Colloquio annullato',
        righe: [`${chi} ha annullato il colloquio di ${p.quando}.`],
        bottone: ['Vedi l’appuntamento', link] as [string, string],
      },
    }[evento];
  }

  const html = cornice({
    sito,
    preheader: t.righe[0],
    contenuto: `
      ${titolo(t.titolo)}
      ${t.righe.map(par).join('')}
      ${nota ? `<div style="margin:0 0 14px;padding:14px 16px;background:${CREMA};border-radius:12px;border-left:3px solid ${MIRTILLO};white-space:pre-wrap;">${esc(nota)}</div>` : ''}
      ${t.meet && p.meet && p.setting === 'online' ? `<p style="margin:0 0 14px;padding:14px 16px;background:#E2E4F1;border-radius:12px;">${estero ? ESTERO[estero].linkVideo : 'Link della videochiamata'}:<br><a href="${esc(p.meet)}" style="color:${MIRTILLO};font-weight:bold;word-break:break-all;">${esc(p.meet)}</a></p>` : ''}
      ${bottone(t.bottone[0], t.bottone[1])}
      ${t.secondario ? linkSecondario(t.secondario[0], t.secondario[1]) : ''}
      ${per === 'persona' ? `<p style="margin:0;white-space:pre-line;">${esc(firma)}</p>` : ''}`,
  });
  const testo = [
    ...t.righe, nota ? `\n«${nota}»` : '',
    t.meet && p.meet && p.setting === 'online' ? `\n${estero ? ESTERO[estero].linkVideo : 'Link della videochiamata'}: ${p.meet}` : '', '',
    `${t.bottone[0]}: ${t.bottone[1]}`,
    t.secondario ? `${t.secondario[0]}: ${t.secondario[1]}` : '',
    per === 'persona' ? `\n${firma}` : '',
  ].filter((r) => r !== '').join('\n');
  return { oggetto: t.oggetto, html, testo };
}
