// ============================================================
// Accesso al database con la chiave di servizio
// ------------------------------------------------------------
// Questa chiave scavalca le regole RLS: esiste solo qui, dentro le
// Edge Function, e non raggiunge mai il browser. È il motivo per cui
// il sito pubblico può scrivere i contatti senza avere alcun permesso.
// ============================================================

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function servizio(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/* ---------- Impostazioni (SMTP, Trello, sito) ---------- */

export type ImpostazioniSmtp = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  /** Pausa fra un invio e l'altro, in millisecondi: protegge la reputazione. */
  delay_ms?: number;
  /** Quante email per lotto: il pannello richiama la funzione finché non finisce. */
  batch?: number;
};

export type ImpostazioniTrello = {
  key?: string;
  token?: string;
  board_id?: string;
  /** Lista dove finiscono le nuove richieste di colloquio. */
  list_id?: string;
  /** Lista dove finiscono le semplici iscrizioni newsletter (facoltativa). */
  list_id_newsletter?: string;
  attivo?: boolean;
};

export type ImpostazioniSito = {
  url?: string;
  nome?: string;
  /** Firma in fondo alle email automatiche. */
  firma?: string;
};

export async function leggiImpostazioni<T>(sb: SupabaseClient, key: string): Promise<T> {
  const { data } = await sb.from('app_settings').select('value').eq('key', key).maybeSingle();
  return (data?.value ?? {}) as T;
}

export async function salvaImpostazioni(
  sb: SupabaseClient,
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  await sb.from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

/* ---------- Freno anti-abuso ---------- */

/**
 * Consente al massimo `max` richieste per `impronta` dentro la finestra.
 * Non è una difesa militare: serve a impedire che un bot riempia il
 * database di finte iscrizioni o falsi le statistiche.
 */
export async function entroIlLimite(
  sb: SupabaseClient,
  impronta: string,
  max: number,
  finestraMinuti = 60,
): Promise<boolean> {
  const bucket = `${impronta}:${max}:${finestraMinuti}`;
  const ora = new Date();
  const { data } = await sb.from('rate_limits').select('*').eq('bucket', bucket).maybeSingle();

  if (!data) {
    await sb.from('rate_limits').insert({ bucket, count: 1, window_start: ora.toISOString() });
    return true;
  }

  const inizio = new Date(data.window_start);
  const scaduta = (ora.getTime() - inizio.getTime()) / 60000 >= finestraMinuti;

  if (scaduta) {
    await sb.from('rate_limits')
      .update({ count: 1, window_start: ora.toISOString() })
      .eq('bucket', bucket);
    return true;
  }

  if (data.count >= max) return false;

  await sb.from('rate_limits').update({ count: data.count + 1 }).eq('bucket', bucket);
  return true;
}
