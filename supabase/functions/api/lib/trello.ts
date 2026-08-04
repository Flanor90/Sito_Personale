// ============================================================
// Trello — apertura automatica delle schede
// ------------------------------------------------------------
// Quando qualcuno lascia l'email o chiede un colloquio, nasce una
// scheda nella bacheca scelta: così la richiesta entra subito nel
// flusso di lavoro invece di restare in un pannello da controllare.
//
// Chiave e token stanno in app_settings e non escono mai dal server.
// ============================================================

import type { ImpostazioniTrello } from './db.ts';

const BASE = 'https://api.trello.com/1';

export class ErroreTrello extends Error {}

function credenziali(t: ImpostazioniTrello): string {
  if (!t.key || !t.token) throw new ErroreTrello('Trello non configurato: mancano chiave o token.');
  return `key=${encodeURIComponent(t.key)}&token=${encodeURIComponent(t.token)}`;
}

async function chiama(t: ImpostazioniTrello, percorso: string, init?: RequestInit) {
  const sep = percorso.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${percorso}${sep}${credenziali(t)}`, init);
  if (!res.ok) {
    const dettaglio = await res.text().catch(() => '');
    throw new ErroreTrello(`Trello ha risposto ${res.status}: ${dettaglio.slice(0, 200)}`);
  }
  return res.json();
}

/** Le bacheche a cui il token ha accesso: popola il menu nel pannello. */
export function bacheche(t: ImpostazioniTrello) {
  return chiama(t, '/members/me/boards?fields=name,url&filter=open');
}

/** Le colonne di una bacheca. */
export function liste(t: ImpostazioniTrello, boardId: string) {
  return chiama(t, `/boards/${encodeURIComponent(boardId)}/lists?fields=name`);
}

/** Verifica che il token sia valido, senza creare nulla. */
export function chiSono(t: ImpostazioniTrello) {
  return chiama(t, '/members/me?fields=username,fullName');
}

export type NuovaScheda = {
  listId: string;
  titolo: string;
  descrizione: string;
  /** Etichette testuali da appuntare come commento (Trello richiede id per le label vere). */
  scadenzaGiorni?: number;
};

export async function creaScheda(
  t: ImpostazioniTrello,
  s: NuovaScheda,
): Promise<{ id: string; url: string }> {
  const corpo = new URLSearchParams({
    idList: s.listId,
    name: s.titolo.slice(0, 16000),
    desc: s.descrizione.slice(0, 16000),
    pos: 'top',
  });

  if (s.scadenzaGiorni) {
    const d = new Date();
    d.setDate(d.getDate() + s.scadenzaGiorni);
    corpo.set('due', d.toISOString());
  }

  const scheda = await chiama(t, '/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
  });

  return { id: scheda.id, url: scheda.url ?? scheda.shortUrl };
}

/**
 * Descrizione della scheda per una richiesta di primo colloquio.
 * Markdown, perché Trello lo rende nel corpo della scheda.
 */
export function descrizioneRichiesta(d: {
  email: string;
  telefono?: string | null;
  setting?: string | null;
  temi: string[];
  messaggio?: string | null;
  lang?: string | null;
  fonte?: string | null;
}): string {
  const righe = [
    `**Email:** ${d.email}`,
    d.telefono ? `**Telefono:** ${d.telefono}` : '',
    d.setting ? `**Setting preferito:** ${d.setting}` : '',
    d.temi.length ? `**Temi:** ${d.temi.join(' · ')}` : '',
    d.lang && d.lang !== 'it' ? `**Lingua:** ${d.lang}` : '',
    d.fonte ? `**Arrivato da:** ${d.fonte}` : '',
  ].filter(Boolean);

  if (d.messaggio) righe.push('', '---', '', d.messaggio);
  righe.push('', '_Scheda creata automaticamente dal sito._');
  return righe.join('\n');
}
