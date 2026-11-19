-- ============================================================
-- Prenotazioni: la persona conferma la propria presenza
-- ------------------------------------------------------------
-- Facoltativo: dall'email di conferma o dal promemoria la persona può
-- dire «ci sarò». Alberto riceve un avviso. Torna vuoto se l'orario cambia.
-- Idempotente: il workflow delle funzioni la riapplica senza danni.
-- ============================================================

alter table public.bookings add column if not exists presenza_confermata_at timestamptz;
