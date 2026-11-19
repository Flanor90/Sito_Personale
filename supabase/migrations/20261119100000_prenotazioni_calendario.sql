-- ============================================================
-- Prenotazioni: evento nel Google Calendar, link Meet, promemoria
-- ------------------------------------------------------------
-- google_event_id   l'evento creato dallo script nel calendario di Alberto
--                   (provvisorio finché la prenotazione è in attesa)
-- meet_link         il link Google Meet per i colloqui online confermati
-- reminder_sent_at  quando è partito il promemoria del giorno prima;
--                   torna vuoto se l'orario cambia
-- Idempotente: il workflow delle funzioni la riapplica senza danni.
-- ============================================================

alter table public.bookings add column if not exists google_event_id  text;
alter table public.bookings add column if not exists meet_link        text;
alter table public.bookings add column if not exists reminder_sent_at timestamptz;
