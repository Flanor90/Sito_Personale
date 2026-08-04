-- ============================================================
-- Funzioni di statistica per il pannello
-- ------------------------------------------------------------
-- Aggregare nel database invece che nel browser ha due vantaggi:
-- il pannello resta leggero anche con centinaia di migliaia di righe,
-- e i dati grezzi non escono mai dal server.
--
-- Tutte le funzioni sono security definer con controllo esplicito
-- is_admin(): girano con privilegi elevati ma rifiutano chiunque non
-- sia l'amministratore.
--
-- Le date sono raggruppate sul fuso italiano (Europe/Rome), non su UTC:
-- altrimenti una visita delle 00:30 finirebbe nel giorno prima.
-- ============================================================

-- Ferma la chiamata se non è l'amministratore. Chiamata da ogni funzione.
create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Numeri di sintesi del periodo
-- ------------------------------------------------------------
create or replace function public.stats_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visits     int;
  v_pageviews  int;
  v_seconds    numeric;
  v_contacts   int;
  v_messages   int;
  v_confirmed  int;
begin
  perform public.assert_admin();

  select count(distinct session_id), count(*), coalesce(avg(nullif(seconds, 0)), 0)
    into v_visits, v_pageviews, v_seconds
    from public.page_views
   where created_at >= p_from and created_at < p_to;

  select count(*) into v_contacts
    from public.contacts
   where created_at >= p_from and created_at < p_to;

  select count(*) into v_confirmed
    from public.contacts
   where confirmed_at >= p_from and confirmed_at < p_to;

  select count(*) into v_messages
    from public.messages
   where created_at >= p_from and created_at < p_to;

  return jsonb_build_object(
    'visits',        v_visits,
    'pageviews',     v_pageviews,
    'avg_seconds',   round(v_seconds, 1),
    'contacts',      v_contacts,
    'confirmed',     v_confirmed,
    'messages',      v_messages,
    -- Conversione = quante visite lasciano un'email. È il numero che
    -- dice se il sito sta funzionando come porta d'ingresso.
    'conversion',    case when v_visits > 0
                          then round((v_contacts::numeric / v_visits) * 100, 2)
                          else 0 end
  );
end;
$$;

-- ------------------------------------------------------------
-- Andamento nel tempo (ora / giorno / settimana / mese)
-- ------------------------------------------------------------
create or replace function public.stats_timeseries(
  p_from   timestamptz,
  p_to     timestamptz,
  p_bucket text default 'day'
)
returns table (
  bucket    timestamp,
  visits    int,
  pageviews int,
  contacts  int,
  messages  int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_unit text;
begin
  perform public.assert_admin();

  -- Whitelist: p_bucket finisce dentro date_trunc, quindi non può essere
  -- un valore arbitrario che arriva dal client.
  v_unit := case lower(coalesce(p_bucket, 'day'))
              when 'hour'  then 'hour'
              when 'day'   then 'day'
              when 'week'  then 'week'
              when 'month' then 'month'
              when 'year'  then 'year'
              else 'day'
            end;

  return query
  with periodi as (
    select generate_series(
             date_trunc(v_unit, p_from at time zone 'Europe/Rome'),
             date_trunc(v_unit, (p_to - interval '1 microsecond') at time zone 'Europe/Rome'),
             ('1 ' || v_unit)::interval
           ) as b
  ),
  visite as (
    select date_trunc(v_unit, created_at at time zone 'Europe/Rome') as b,
           count(distinct session_id)::int as visits,
           count(*)::int                   as pageviews
      from public.page_views
     where created_at >= p_from and created_at < p_to
     group by 1
  ),
  nuovi as (
    select date_trunc(v_unit, created_at at time zone 'Europe/Rome') as b,
           count(*)::int as contacts
      from public.contacts
     where created_at >= p_from and created_at < p_to
     group by 1
  ),
  richieste as (
    select date_trunc(v_unit, created_at at time zone 'Europe/Rome') as b,
           count(*)::int as messages
      from public.messages
     where created_at >= p_from and created_at < p_to
     group by 1
  )
  select p.b::timestamp,
         coalesce(v.visits, 0),
         coalesce(v.pageviews, 0),
         coalesce(n.contacts, 0),
         coalesce(r.messages, 0)
    from periodi p
    left join visite    v on v.b = p.b
    left join nuovi     n on n.b = p.b
    left join richieste r on r.b = p.b
   order by p.b;
end;
$$;

-- ------------------------------------------------------------
-- Le pagine (o sezioni) più viste
-- ------------------------------------------------------------
create or replace function public.stats_pages(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int default 50
)
returns table (
  path        text,
  title       text,
  pageviews   int,
  visits      int,
  avg_seconds numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return query
  select pv.path,
         (array_agg(pv.title order by pv.created_at desc)
            filter (where pv.title is not null))[1] as title,
         count(*)::int                              as pageviews,
         count(distinct pv.session_id)::int         as visits,
         round(coalesce(avg(nullif(pv.seconds, 0)), 0), 1)
    from public.page_views pv
   where pv.created_at >= p_from and pv.created_at < p_to
   group by pv.path
   order by count(*) desc
   limit greatest(1, least(coalesce(p_limit, 50), 500));
end;
$$;

-- ------------------------------------------------------------
-- Da dove arrivano le visite (referrer + campagne UTM)
-- ------------------------------------------------------------
create or replace function public.stats_sources(p_from timestamptz, p_to timestamptz)
returns table (
  source text,
  visits int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return query
  select coalesce(nullif(pv.utm_source, ''),
                  nullif(pv.referrer_host, ''),
                  'diretto')                as source,
         count(distinct pv.session_id)::int as visits
    from public.page_views pv
   where pv.created_at >= p_from and pv.created_at < p_to
   group by 1
   order by 2 desc;
end;
$$;

-- ------------------------------------------------------------
-- Da quale punto del sito arrivano le email
-- ------------------------------------------------------------
create or replace function public.stats_contact_sources(p_from timestamptz, p_to timestamptz)
returns table (
  source   text,
  contacts int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return query
  select coalesce(nullif(c.first_source, ''), 'sconosciuta') as source,
         count(*)::int
    from public.contacts c
   where c.created_at >= p_from and c.created_at < p_to
   group by 1
   order by 2 desc;
end;
$$;

-- ------------------------------------------------------------
-- Imbuto: quante persone arrivano a ciascun passo
-- ------------------------------------------------------------
create or replace function public.stats_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  name     text,
  n        int,
  sessions int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return query
  select e.name,
         count(*)::int,
         count(distinct e.session_id)::int
    from public.events e
   where e.created_at >= p_from and e.created_at < p_to
   group by e.name
   order by 2 desc;
end;
$$;

-- ------------------------------------------------------------
-- Destinatari di una newsletter, secondo i filtri scelti
-- ------------------------------------------------------------
-- Unica fonte di verità: la usa sia l'anteprima nel pannello ("scriverai
-- a 143 persone") sia l'invio vero. Impossibile che le due divergano.
--
-- Tre condizioni non negoziabili, applicate sempre, qualunque filtro:
--   1. deve avere dato il consenso alla newsletter;
--   2. non deve essersi disiscritto;
--   3. l'indirizzo non deve aver rimbalzato.
create or replace function public.audience_contacts(p_audience jsonb)
returns table (
  id    uuid,
  email text,
  name  text,
  lang  text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status  text[];
  v_sources text[];
  v_tags    text[];
  v_langs   text[];
begin
  perform public.assert_admin();

  p_audience := coalesce(p_audience, '{}'::jsonb);

  -- Di default solo chi ha confermato con il double opt-in.
  v_status  := coalesce(
                 (select array_agg(value::text)
                    from jsonb_array_elements_text(p_audience -> 'status')),
                 array['confirmed']);
  v_sources := (select array_agg(value::text)
                  from jsonb_array_elements_text(p_audience -> 'sources'));
  v_tags    := (select array_agg(value::text)
                  from jsonb_array_elements_text(p_audience -> 'tags'));
  v_langs   := (select array_agg(value::text)
                  from jsonb_array_elements_text(p_audience -> 'langs'));

  return query
  select c.id, c.email, c.name, c.lang
    from public.contacts c
   where c.consent_newsletter = true
     and c.status <> 'unsubscribed'
     and c.status <> 'bounced'
     and c.status = any (v_status)
     and (v_langs is null or c.lang = any (v_langs))
     and (v_tags  is null or c.tags && v_tags)
     and (
       v_sources is null
       or c.first_source = any (v_sources)
       or c.last_source  = any (v_sources)
       or exists (
            select 1 from public.contact_events ce
             where ce.contact_id = c.id and ce.source = any (v_sources)
          )
     )
   order by c.created_at;
end;
$$;

-- ------------------------------------------------------------
-- Permessi di esecuzione: solo utenti loggati (poi filtra is_admin)
-- ------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'assert_admin()',
    'stats_overview(timestamptz, timestamptz)',
    'stats_timeseries(timestamptz, timestamptz, text)',
    'stats_pages(timestamptz, timestamptz, int)',
    'stats_sources(timestamptz, timestamptz)',
    'stats_contact_sources(timestamptz, timestamptz)',
    'stats_funnel(timestamptz, timestamptz)',
    'audience_contacts(jsonb)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
