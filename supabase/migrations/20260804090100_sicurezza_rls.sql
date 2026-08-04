-- ============================================================
-- Sicurezza: Row Level Security su tutto
-- ------------------------------------------------------------
-- Il principio è "chiuso salvo eccezioni": attivo RLS su ogni tabella
-- e poi concedo il minimo indispensabile.
--
--   • anon (il visitatore del sito)  → NESSUN permesso, su nessuna tabella.
--     Il sito pubblico non parla mai col database: passa dalle Edge
--     Function, che usano la chiave di servizio lato server. Così la
--     chiave pubblica nel browser, anche se letta da chiunque (ed è
--     pubblica per definizione), non permette di leggere né scrivere nulla.
--
--   • authenticated (chi ha fatto login) → tutto, MA solo se la sua email
--     è in admin_emails. Se un domani venisse creato per sbaglio un altro
--     utente, non vedrebbe una riga.
--
--   • tokens, app_settings, rate_limits, admin_emails → nessuna policy.
--     Le tocca solo il codice server. Le password SMTP e il token Trello
--     non sono leggibili dal browser nemmeno da Alberto loggato.
-- ============================================================

-- Chi sta chiamando è l'amministratore?
-- security definer perché deve poter leggere admin_emails, che è chiusa a tutti.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- Attivo RLS ovunque
-- ------------------------------------------------------------
alter table public.contacts              enable row level security;
alter table public.contact_events        enable row level security;
alter table public.messages              enable row level security;
alter table public.page_views            enable row level security;
alter table public.events                enable row level security;
alter table public.newsletters           enable row level security;
alter table public.newsletter_recipients enable row level security;
alter table public.tokens                enable row level security;
alter table public.app_settings          enable row level security;
alter table public.rate_limits           enable row level security;
alter table public.admin_emails          enable row level security;

-- Blindo anche i permessi di tabella, non solo le policy: anon non ha
-- proprio il diritto di provarci.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- ------------------------------------------------------------
-- Policy per l'amministratore
-- ------------------------------------------------------------
-- Un blocco unico per le tabelle che il pannello legge e modifica.
do $$
declare
  t text;
begin
  foreach t in array array[
    'contacts', 'contact_events', 'messages',
    'page_views', 'events',
    'newsletters', 'newsletter_recipients'
  ]
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I
         for all
         to authenticated
         using (public.is_admin())
         with check (public.is_admin())', t);
  end loop;
end;
$$;

-- tokens, app_settings, rate_limits e admin_emails restano SENZA policy:
-- con RLS attivo e nessuna policy, l'accesso è negato a chiunque non sia
-- la service role (che per progetto salta sempre RLS). È voluto.
