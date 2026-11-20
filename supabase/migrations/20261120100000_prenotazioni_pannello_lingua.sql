-- ============================================================
-- Prenotazioni: lettura dal pannello e lingua della persona
-- ------------------------------------------------------------
-- lang       la lingua del modulo da cui è partita la prenotazione
--            (it, en, es): email e pagina dell'appuntamento la seguono
-- admin_read il pannello legge le prenotazioni (solo lettura: ogni
--            modifica passa dalla pagina /prenotazione/ e dalla funzione)
-- Idempotente: il workflow delle funzioni la riapplica senza danni.
-- ============================================================

alter table public.bookings add column if not exists lang text not null default 'it';

drop policy if exists admin_read on public.bookings;
create policy admin_read on public.bookings
  for select
  to authenticated
  using (public.is_admin());
