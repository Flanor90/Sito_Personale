-- ============================================================
-- Schema iniziale del pannello di amministrazione
-- ------------------------------------------------------------
-- Tre famiglie di tabelle:
--   1. CONTATTI   — le email raccolte dal sito, da qualsiasi punto
--   2. ANALYTICS  — visite e conversioni, senza cookie e senza IP
--   3. NEWSLETTER — bozze, destinatari, esito degli invii
-- più le tabelle di servizio (token, impostazioni, rate limit) che
-- restano invisibili anche all'amministratore loggato: le legge solo
-- il codice server (service role), mai il browser.
--
-- Regola generale: il sito pubblico NON scrive mai direttamente qui.
-- Ogni scrittura passa da una Edge Function, così il browser non ha
-- bisogno di permessi di scrittura e non c'è nulla da rubare.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTATTI
-- ------------------------------------------------------------

-- Un contatto = un indirizzo email, una riga sola. Se la stessa
-- persona lascia l'email tre volte (test, compendi, contatti) resta
-- un contatto solo: le tre occasioni finiscono in contact_events.
create table if not exists public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  name               text,
  phone              text,
  lang               text not null default 'it',
  -- Da dove è arrivata la primissima volta e da dove l'ultima:
  -- serve per capire quale canale porta davvero contatti.
  first_source       text,
  last_source        text,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  -- Consenso esplicito alla newsletter (la spunta sul form).
  consent_newsletter boolean not null default false,
  -- Prova del consenso: quando e da dove è stata data.
  consent_at         timestamptz,
  consent_proof      jsonb not null default '{}'::jsonb,
  confirmed_at       timestamptz,
  unsubscribed_at    timestamptz,
  tags               text[] not null default '{}',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- L'unicità è sull'email normalizzata (minuscola, senza spazi):
-- "Mario@Esempio.IT" e "mario@esempio.it" sono la stessa persona.
create unique index if not exists contacts_email_key
  on public.contacts (lower(btrim(email)));

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);
create index if not exists contacts_status_idx     on public.contacts (status);
create index if not exists contacts_source_idx     on public.contacts (first_source);

-- Ogni singola volta che quell'email è stata lasciata, con il contesto.
create table if not exists public.contact_events (
  id         bigint generated always as identity primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  -- Famiglia dell'evento: newsletter | test | compendi | contatto
  kind       text not null,
  -- Fonte granulare: test-adhd, test-burnout, newsletter, compendi…
  source     text not null,
  lang       text,
  page       text,
  referrer   text,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_events_contact_idx on public.contact_events (contact_id);
create index if not exists contact_events_created_idx on public.contact_events (created_at desc);

-- Il messaggio completo del form contatti (triage clinico): non è una
-- semplice email, è una richiesta di primo colloquio e va conservata
-- per intero, con i temi selezionati.
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete set null,
  name            text,
  email           text not null,
  phone           text,
  setting         text,
  topics          text[] not null default '{}',
  body            text,
  lang            text,
  status          text not null default 'nuovo'
                  check (status in ('nuovo', 'letto', 'risposto', 'archiviato')),
  -- Riferimento alla scheda Trello creata automaticamente, se attiva.
  trello_card_id  text,
  trello_card_url text,
  created_at      timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_at desc);
create index if not exists messages_status_idx  on public.messages (status);

-- ------------------------------------------------------------
-- 2. ANALYTICS — senza cookie, senza IP, senza profilazione
-- ------------------------------------------------------------
-- session_id è un identificativo casuale che vive solo in sessionStorage
-- e muore alla chiusura della scheda: serve a non contare dieci volte la
-- stessa persona che naviga, non a riconoscerla domani. Nessun IP viene
-- salvato. Per questo il tracciamento non richiede banner dei cookie.

create table if not exists public.page_views (
  id            bigint generated always as identity primary key,
  session_id    text not null,
  path          text not null,
  title         text,
  -- Solo il dominio di provenienza (google.com), mai l'URL completo.
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  lang          text,
  country       text,
  device        text,
  browser       text,
  -- Secondi passati sulla pagina, aggiornati quando la si lascia.
  seconds       int,
  created_at    timestamptz not null default now()
);

create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx    on public.page_views (path);
create index if not exists page_views_session_idx on public.page_views (session_id);

-- Le azioni che contano come conversione o quasi-conversione:
-- test iniziato/finito, email lasciata, richiesta inviata, click su CTA.
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  session_id text not null,
  name       text not null,
  path       text,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_name_idx    on public.events (name);

-- ------------------------------------------------------------
-- 3. NEWSLETTER
-- ------------------------------------------------------------

create table if not exists public.newsletters (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null,
  preheader    text,
  -- Il testo come lo scrive Alberto (markdown leggero) e la sua resa HTML.
  body_md      text not null default '',
  body_html    text not null default '',
  -- Chi deve riceverla: { status: [...], sources: [...], tags: [...], langs: [...] }
  audience     jsonb not null default '{}'::jsonb,
  status       text not null default 'bozza'
               check (status in ('bozza', 'in_invio', 'inviata', 'errore')),
  sent_at      timestamptz,
  total        int not null default 0,
  sent_count   int not null default 0,
  failed_count int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists newsletters_created_idx on public.newsletters (created_at desc);

-- Una riga per destinatario: è il registro di cosa è partito davvero.
-- Se un invio si interrompe a metà, si riprende da qui senza doppioni.
create table if not exists public.newsletter_recipients (
  id            bigint generated always as identity primary key,
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  email         text not null,
  status        text not null default 'in_coda'
                check (status in ('in_coda', 'inviata', 'errore')),
  error         text,
  sent_at       timestamptz,
  unique (newsletter_id, contact_id)
);

create index if not exists newsletter_recipients_nl_idx
  on public.newsletter_recipients (newsletter_id, status);

-- ------------------------------------------------------------
-- 4. TABELLE DI SERVIZIO — mai esposte al browser
-- ------------------------------------------------------------

-- Token per la conferma dell'iscrizione (double opt-in) e per la
-- disiscrizione con un click. Non hanno policy RLS: nemmeno
-- l'amministratore loggato può leggerli dal browser.
create table if not exists public.tokens (
  token      text primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  purpose    text not null check (purpose in ('confirm', 'unsubscribe')),
  expires_at timestamptz,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tokens_contact_idx on public.tokens (contact_id, purpose);

-- Impostazioni con i segreti (password SMTP, token Trello). Il browser
-- non le legge MAI: il pannello ne vede solo una versione mascherata,
-- restituita dalla Edge Function admin-api.
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Freno anti-abuso per gli endpoint pubblici (una riga per finestra).
create table if not exists public.rate_limits (
  bucket       text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

-- Chi può entrare nel pannello. Contiene email, non UUID, così basta
-- creare l'utente in Supabase con quella email perché diventi admin.
create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_emails (email)
values ('alberto.delbove.psicoterapeuta@gmail.com')
on conflict (email) do nothing;

-- ------------------------------------------------------------
-- 5. Trigger di manutenzione
-- ------------------------------------------------------------

-- Normalizza l'email (minuscola, senza spazi) prima di ogni scrittura,
-- così l'indice unico funziona sempre anche se il chiamante se ne scorda.
create or replace function public.normalize_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contacts_normalize_email on public.contacts;
create trigger contacts_normalize_email
  before insert or update on public.contacts
  for each row execute function public.normalize_email();

drop trigger if exists messages_normalize_email on public.messages;
create trigger messages_normalize_email
  before insert or update on public.messages
  for each row execute function public.normalize_email();

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch
  before update on public.contacts
  for each row execute function public.touch_updated_at();

drop trigger if exists newsletters_touch on public.newsletters;
create trigger newsletters_touch
  before update on public.newsletters
  for each row execute function public.touch_updated_at();
