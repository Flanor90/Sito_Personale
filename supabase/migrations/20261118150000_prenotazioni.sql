-- ============================================================
-- Prenotazioni del colloquio conoscitivo
-- ------------------------------------------------------------
-- La persona sceglie un orario libero; Alberto lo conferma o ne propone
-- un altro; la persona accetta o ne sceglie un altro ancora. Ogni parte
-- ha un suo token: chi ha il link della persona non può confermare al
-- posto di Alberto, e viceversa.
--
-- Idempotente: il workflow delle funzioni la riapplica senza danni.
-- ============================================================

create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid references public.contacts(id) on delete set null,
  message_id     uuid references public.messages(id) on delete set null,
  name           text,
  email          text not null,
  phone          text,
  setting        text not null default 'online' check (setting in ('online', 'studio')),
  slot_start     timestamptz not null,
  slot_end       timestamptz not null,
  status         text not null default 'in_attesa'
                 check (status in ('in_attesa', 'proposta', 'confermata', 'annullata')),
  proposed_by    text not null default 'persona' check (proposed_by in ('persona', 'alberto')),
  token_persona  text not null unique,
  token_alberto  text not null unique,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bookings_slot_idx   on public.bookings (slot_start);
create index if not exists bookings_status_idx on public.bookings (status);

-- Nessuna policy: dal browser non si legge né si scrive niente. Passa
-- tutto dalla funzione "api", con la chiave di servizio.
alter table public.bookings enable row level security;
