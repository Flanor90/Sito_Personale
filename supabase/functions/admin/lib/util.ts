// ============================================================
// Utilità condivise dalle Edge Function
// ============================================================

/** Origini autorizzate a chiamare le funzioni pubbliche. */
const ORIGINI = [
  'https://www.albertodelbove-psicologo.it',
  'https://albertodelbove-psicologo.it',
  'http://localhost:8742',
  'http://127.0.0.1:8742',
];

export function cors(origin: string | null): Record<string, string> {
  // Rispondiamo con l'origine esatta (non "*") così il browser accetta
  // anche le richieste con credenziali, e le origini sconosciute vengono
  // riportate al dominio di produzione invece di essere autorizzate.
  const ok = origin && ORIGINI.includes(origin) ? origin : ORIGINI[0];
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) },
  });
}

/** Stessa regola di validazione usata sul sito (quiz-core.js). */
export function emailValida(email: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim());
}

export function normalizzaEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}

/** Taglia una stringa a una lunghezza massima, per non farsi riempire il database. */
export function testo(v: unknown, max = 500): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.slice(0, max);
}

/** Token casuale robusto (URL-safe) per conferma e disiscrizione. */
export function nuovoToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Impronta anonima del chiamante, per il freno anti-abuso.
 * L'IP non viene mai salvato: se ne conserva solo un hash troncato,
 * che cambia ogni giorno perché la data entra nell'hash. Serve a contare
 * "quante richieste da questa provenienza oggi", non a identificare nessuno.
 */
export async function improntaChiamante(req: Request, sale: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'ignoto';
  const giorno = new Date().toISOString().slice(0, 10);
  const dati = new TextEncoder().encode(`${sale}|${giorno}|${ip}`);
  const hash = await crypto.subtle.digest('SHA-256', dati);
  return [...new Uint8Array(hash)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Solo il dominio del referrer: mai l'URL completo, che può contenere dati. */
export function dominioReferrer(ref: unknown): string | null {
  const s = String(ref ?? '').trim();
  if (!s) return null;
  try {
    return new URL(s).hostname.replace(/^www\./, '').slice(0, 120);
  } catch {
    return null;
  }
}

/** Escape HTML: qualunque testo che finisce dentro una email o una pagina. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
