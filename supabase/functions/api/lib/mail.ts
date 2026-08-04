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
        subject: m.oggetto,
        content: m.testo,
        html: m.html,
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
      ${poscritto}`,
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
}): { oggetto: string; html: string; testo: string } {
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
                 line-height:1.3;color:${NOTTE};font-weight:normal;">Nuova richiesta di primo colloquio</h1>
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
      ${opts.linkTrello ? bottone('Apri la scheda su Trello', opts.linkTrello) : ''}`,
  });

  const testo = [
    'Nuova richiesta di primo colloquio',
    '',
    `Nome: ${opts.nome}`,
    `Email: ${opts.email}`,
    opts.telefono ? `Telefono: ${opts.telefono}` : '',
    opts.setting ? `Setting: ${opts.setting}` : '',
    opts.temi.length ? `Temi: ${opts.temi.join(' · ')}` : '',
    '',
    opts.messaggio ?? '',
    opts.linkTrello ? `\nTrello: ${opts.linkTrello}` : '',
  ].filter(Boolean).join('\n');

  return { oggetto: `Richiesta primo colloquio — ${opts.nome}`, html, testo };
}
