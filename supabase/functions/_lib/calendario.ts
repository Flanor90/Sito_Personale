// ============================================================
// Calendario: gli orari prenotabili per il colloquio conoscitivo
// ------------------------------------------------------------
// Un orario è libero se:
//   1. cade negli orari di lavoro impostati nel pannello (online e studio
//      possono avere giorni e ore diversi);
//   2. è abbastanza avanti nel tempo (preavviso minimo) e non troppo;
//   3. non è un festivo italiano;
//   4. non si sovrappone a una prenotazione in attesa, proposta o confermata;
//   5. non si sovrappone a un impegno del Google Calendar di Alberto, se nel
//      pannello c'è l'indirizzo iCal privato del calendario.
//
// La persona sceglie, Alberto conferma o propone un altro orario: per questo
// un calendario un po' impreciso non fa danni, al massimo uno scambio in più.
// ============================================================

export type ImpostazioniCalendario = {
  /** Es. "lun-ven: 9 10 11 12 14 15 16 17" oppure "lun,mer: 9 10; ven: 15 16". */
  orari_online?: string;
  orari_studio?: string;
  /** Indirizzo segreto in formato iCal di Google Calendar (facoltativo). */
  ics_url?: string;
  preavviso_ore?: number;
  giorni_avanti?: number;
  durata_min?: number;
};

export const ORARI_PREDEFINITI = 'lun-ven: 9 10 11 12 14 15 16 17';
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export type Intervallo = { inizio: number; fine: number };

/** Da "lun-ven: 9 10; sab: 10" a { 1: [9,10], ..., 6: [10] }. */
export function leggiOrari(testo: string | undefined): Record<number, number[]> {
  const fuori: Record<number, number[]> = {};
  for (const pezzo of (testo || ORARI_PREDEFINITI).toLowerCase().split(';')) {
    const [giorniTesto, oreTesto] = pezzo.split(':');
    if (!oreTesto) continue;
    const ore = oreTesto.split(/[\s,]+/).map((o) => o.replace(/\..*$/, ''))
      .map(Number).filter((o) => Number.isInteger(o) && o >= 6 && o <= 22);
    const giorni = new Set<number>();
    for (const g of giorniTesto.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [da, a] = g.split('-').map((s) => GIORNI.indexOf(s.trim().slice(0, 3)));
      if (da < 0) continue;
      if (a === undefined || a < 0) { giorni.add(da); continue; }
      for (let i = da; ; i = (i + 1) % 7) { giorni.add(i); if (i === a) break; }
    }
    for (const g of giorni) fuori[g] = [...new Set([...(fuori[g] ?? []), ...ore])].sort((x, y) => x - y);
  }
  return fuori;
}

/* ---------- Ora di Roma ---------- */

function scartoRoma(ms: number): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(ms));
  const v = (t: string) => Number(parti.find((p) => p.type === t)!.value);
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute')) - ms;
}

/** L'istante UTC di un'ora locale di Roma. */
export function istanteRoma(a: number, m: number, g: number, ora: number, minuti = 0): number {
  const stima = Date.UTC(a, m, g, ora, minuti);
  return stima - scartoRoma(stima);
}

/** Il giorno di calendario a Roma di un istante. */
function giornoRoma(ms: number) {
  const d = new Date(ms + scartoRoma(ms));
  return { a: d.getUTCFullYear(), m: d.getUTCMonth(), g: d.getUTCDate(), dow: d.getUTCDay() };
}

/** "giovedì 20 novembre alle 10:00", in ora italiana. */
export function quandoLeggibile(iso: string): string {
  const d = new Date(iso);
  const giorno = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome',
  }).format(d);
  const ora = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
  }).format(d);
  return `${giorno} alle ${ora}`;
}

/* ---------- Festivi italiani ---------- */

function pasquetta(a: number): string {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4,
    g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3),
    i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4,
    x = (32 + 2 * f + 2 * k - i - l) % 7, y = Math.floor((b + 11 * i + 22 * x) / 451),
    mese = Math.floor((i + x - 7 * y + 114) / 31), giorno = ((i + x - 7 * y + 114) % 31) + 1;
  const p = new Date(Date.UTC(a, mese - 1, giorno + 1));
  return `${p.getUTCMonth()}-${p.getUTCDate()}`;
}
const FESTIVI = ['0-1', '0-6', '3-25', '4-1', '5-2', '7-15', '10-1', '11-8', '11-25', '11-26'];

function festivo(a: number, m: number, g: number): boolean {
  const k = `${m}-${g}`;
  return FESTIVI.includes(k) || k === pasquetta(a);
}

/* ---------- Gli orari liberi ---------- */

export function orariLiberi(opts: {
  conf: ImpostazioniCalendario;
  setting: 'online' | 'studio';
  occupati: Intervallo[];
  adesso?: number;
}): string[] {
  const { conf, setting, occupati } = opts;
  const adesso = opts.adesso ?? Date.now();
  const orari = leggiOrari(setting === 'studio' ? (conf.orari_studio || conf.orari_online) : conf.orari_online);
  const durata = (conf.durata_min || 45) * 60000;
  const primo = adesso + (conf.preavviso_ore ?? 24) * 3600000;
  const giorni = Math.min(Math.max(conf.giorni_avanti || 21, 3), 60);

  const fuori: string[] = [];
  const oggi = giornoRoma(adesso);
  for (let i = 0; i <= giorni; i++) {
    const g = giornoRoma(Date.UTC(oggi.a, oggi.m, oggi.g + i, 12));
    if (festivo(g.a, g.m, g.g)) continue;
    for (const ora of orari[g.dow] ?? []) {
      const inizio = istanteRoma(g.a, g.m, g.g, ora);
      if (inizio < primo) continue;
      const fine = inizio + durata;
      if (occupati.some((o) => o.inizio < fine && o.fine > inizio)) continue;
      fuori.push(new Date(inizio).toISOString());
    }
  }
  return fuori;
}

/* ---------- Google Calendar, dall'indirizzo iCal privato ----------
   Un lettore volutamente piccolo: eventi singoli, ricorrenze settimanali e
   giornaliere (le sedute fisse), eccezioni ed eventi spostati. Gli eventi
   segnati come "disponibile" (TRANSP:TRANSPARENT) non bloccano niente. */

let cache: { url: string; quando: number; intervalli: Intervallo[] } | null = null;

export async function impegniCalendario(url: string | undefined, finoA: number): Promise<Intervallo[]> {
  if (!url) return [];
  if (cache && cache.url === url && Date.now() - cache.quando < 10 * 60000) return cache.intervalli;
  try {
    const r = await fetch(url.replace(/^webcal:/, 'https:'), { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`iCal ${r.status}`);
    const intervalli = leggiIcs(await r.text(), Date.now() - 864e5, finoA);
    cache = { url, quando: Date.now(), intervalli };
    return intervalli;
  } catch (e) {
    console.error('[calendario]', e);
    return cache?.url === url ? cache.intervalli : [];
  }
}

function dataIcs(valore: string, parametri: string): { ms: number; tuttoIlGiorno: boolean } {
  const m = valore.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return { ms: NaN, tuttoIlGiorno: false };
  const [a, me, g] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  if (!m[4]) return { ms: istanteRoma(a, me, g, 0), tuttoIlGiorno: true };
  const [h, mi, s] = [Number(m[4]), Number(m[5]), Number(m[6])];
  if (m[7] === 'Z') return { ms: Date.UTC(a, me, g, h, mi, s), tuttoIlGiorno: false };
  // Ora locale: con o senza TZID la tratto come ora di Roma.
  void parametri;
  return { ms: istanteRoma(a, me, g, h, mi), tuttoIlGiorno: false };
}

export function leggiIcs(testo: string, da: number, a: number): Intervallo[] {
  const righe = testo.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  type Evento = Record<string, { v: string; p: string }[]>;
  const eventi: Evento[] = [];
  let corrente: Evento | null = null;
  for (const riga of righe) {
    if (riga === 'BEGIN:VEVENT') { corrente = {}; continue; }
    if (riga === 'END:VEVENT') { if (corrente) eventi.push(corrente); corrente = null; continue; }
    if (!corrente) continue;
    const i = riga.indexOf(':');
    if (i < 0) continue;
    const [nome, ...par] = riga.slice(0, i).split(';');
    (corrente[nome] ??= []).push({ v: riga.slice(i + 1), p: par.join(';') });
  }

  const spostati = new Set<string>();
  for (const e of eventi) {
    if (e['RECURRENCE-ID']) {
      const r = dataIcs(e['RECURRENCE-ID'][0].v, e['RECURRENCE-ID'][0].p);
      spostati.add(`${e.UID?.[0].v}|${r.ms}`);
    }
  }

  const fuori: Intervallo[] = [];
  for (const e of eventi) {
    if (e.TRANSP?.[0].v === 'TRANSPARENT' || e.STATUS?.[0].v === 'CANCELLED' || !e.DTSTART) continue;
    const s = dataIcs(e.DTSTART[0].v, e.DTSTART[0].p);
    if (isNaN(s.ms)) continue;
    let durata = s.tuttoIlGiorno ? 864e5 : 3600000;
    if (e.DTEND) {
      const f = dataIcs(e.DTEND[0].v, e.DTEND[0].p);
      if (!isNaN(f.ms)) durata = f.ms - s.ms;
    } else if (e.DURATION) {
      const d = e.DURATION[0].v.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
      if (d) durata = ((+d[1] || 0) * 24 * 60 + (+d[2] || 0) * 60 + (+d[3] || 0)) * 60000;
    }
    const esclusi = new Set<number>();
    for (const x of e.EXDATE ?? []) {
      for (const v of x.v.split(',')) esclusi.add(dataIcs(v, x.p).ms);
    }
    const uid = e.UID?.[0].v;
    const aggiungi = (inizio: number) => {
      if (esclusi.has(inizio) || (!e['RECURRENCE-ID'] && spostati.has(`${uid}|${inizio}`))) return;
      if (inizio + durata > da && inizio < a) fuori.push({ inizio, fine: inizio + durata });
    };

    const rrule = e.RRULE?.[0].v;
    if (!rrule) { aggiungi(s.ms); continue; }

    const r: Record<string, string> = {};
    for (const p of rrule.split(';')) { const [k, v] = p.split('='); r[k] = v; }
    const intervallo = Number(r.INTERVAL || 1);
    const conteggio = r.COUNT ? Number(r.COUNT) : Infinity;
    const fino = r.UNTIL ? dataIcs(r.UNTIL, '').ms : Infinity;
    const passo = r.FREQ === 'DAILY' ? 1 : r.FREQ === 'WEEKLY' ? 7 : 0;
    if (!passo) { aggiungi(s.ms); continue; } // mensili e annuali: solo la prima

    const base = giornoRoma(s.ms);
    const oraInizio = new Date(s.ms + scartoRoma(s.ms));
    const [h, mi] = [oraInizio.getUTCHours(), oraInizio.getUTCMinutes()];
    const byday = r.BYDAY && passo === 7
      ? r.BYDAY.split(',').map((d) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(d.slice(-2)))
      : [base.dow];
    let fatti = 0;
    for (let settimana = 0; settimana < 600; settimana += intervallo) {
      for (const dow of byday.sort()) {
        const offset = passo === 7 ? settimana * 7 + (dow - base.dow) : settimana;
        if (passo === 7 && dow < base.dow && settimana === 0) continue;
        const inizio = s.tuttoIlGiorno
          ? istanteRoma(base.a, base.m, base.g + offset, 0)
          : istanteRoma(base.a, base.m, base.g + offset, h, mi);
        if (inizio > fino || fatti >= conteggio || inizio > a) { settimana = 1e9; break; }
        fatti++;
        aggiungi(inizio);
      }
      if (passo === 1 && settimana >= 1e9) break;
    }
  }
  return fuori;
}
