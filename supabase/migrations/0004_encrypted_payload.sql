-- Move event content behind end-to-end encryption.
--
-- The browser encrypts everything a reader would care about into `payload` and
-- keeps the key in the URL fragment, which never reaches the server. The
-- columns dropped below were readable by anyone holding database access
-- (including us), which is exactly what this change removes: they are replaced
-- by one opaque blob.
--
-- What deliberately stays in plaintext: start_at / end_at / all_day, because
-- the expiry purge job needs them, and lang, because the page shell renders
-- before the client has decrypted anything.

alter table public.events
  add column payload text,
  add constraint payload_size check (payload is null or char_length(payload) <= 65536);

-- Dropping these also drops the map_needs_coords constraint and the per-column
-- length checks that referenced them.
alter table public.events
  drop constraint if exists map_needs_coords,
  drop column title,
  drop column location_text,
  drop column map_mode,
  drop column lat,
  drop column lng,
  drop column area_radius,
  drop column description,
  drop column hosted_by,
  drop column external_url;

-- get_event's return type changes, so it has to be dropped and recreated.
drop function if exists public.get_event(text);

create function public.get_event(p_slug text)
returns table (
  payload  text,
  start_at timestamptz,
  end_at   timestamptz,
  all_day  boolean,
  lang     text
)
language sql
security definer
set search_path = public
as $$
  select payload, start_at, end_at, all_day, lang
  from public.events
  where view_slug = p_slug
    and expires_at > now();
$$;

revoke all on function public.get_event(text) from public;
grant execute on function public.get_event(text) to anon, authenticated;
