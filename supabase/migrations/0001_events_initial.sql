-- Tagor: accountless, link-only events with self-cleaning expiry.
-- Security model: RLS is ON and there are NO anon/authenticated policies, so
-- PostgREST gives clients no direct access to the table (no listing, no dumping,
-- no reading the manage token). Public reads happen only through the
-- SECURITY DEFINER get_event(slug) function below, which never returns the
-- manage token or PIN. Create/update/delete run server-side with the service
-- role (Astro API route), which bypasses RLS after a Turnstile + rate-limit check.

create extension if not exists pgcrypto;

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  view_slug     text not null unique,
  manage_token  text not null unique,
  pin_hash      text,
  title         text not null check (char_length(title) between 1 and 200),
  start_at      timestamptz not null,
  end_at        timestamptz,
  all_day       boolean not null default false,
  location_text text not null check (char_length(location_text) between 1 and 300),
  map_mode      text not null default 'none' check (map_mode in ('none','point','area')),
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  area_radius   integer check (area_radius between 50 and 20000),
  description   text check (char_length(description) <= 5000),
  hosted_by     text check (char_length(hosted_by) <= 120),
  external_url  text check (char_length(external_url) <= 500),
  lang          text not null default 'es' check (lang in ('es','en')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  constraint map_needs_coords check (map_mode = 'none' or (lat is not null and lng is not null))
);

create index events_expires_at_idx on public.events (expires_at);

alter table public.events enable row level security;
-- Intentionally no policies: clients cannot touch this table directly.

-- Public read by secret slug. Returns only public fields, and only if not expired.
create or replace function public.get_event(p_slug text)
returns table (
  title         text,
  start_at      timestamptz,
  end_at        timestamptz,
  all_day       boolean,
  location_text text,
  map_mode      text,
  lat           double precision,
  lng           double precision,
  area_radius   integer,
  description   text,
  hosted_by     text,
  external_url  text,
  lang          text
)
language sql
security definer
set search_path = public
as $$
  select title, start_at, end_at, all_day, location_text, map_mode,
         lat, lng, area_radius, description, hosted_by, external_url, lang
  from public.events
  where view_slug = p_slug
    and expires_at > now();
$$;

revoke all on function public.get_event(text) from public;
grant execute on function public.get_event(text) to anon, authenticated;
