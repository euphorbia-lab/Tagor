-- Up to 3 encrypted images per event.
--
-- The images themselves live in the public `event-images` storage bucket at
-- <view_slug>/<n>.bin. Public is safe because every object is ciphertext: the
-- key never leaves the URL fragment, so the bytes are noise without it.
--
-- Only the count is stored here, so the view page knows how many blobs to
-- fetch. The count is metadata we can see, like the dates: it leaks that an
-- event has images, not what they show.

alter table public.events
  add column image_count smallint not null default 0
    check (image_count between 0 and 3);

-- get_event's return type changes again, so drop and recreate.
drop function if exists public.get_event(text);

create function public.get_event(p_slug text)
returns table (
  payload     text,
  start_at    timestamptz,
  end_at      timestamptz,
  all_day     boolean,
  lang        text,
  image_count smallint
)
language sql
security definer
set search_path = public
as $$
  select payload, start_at, end_at, all_day, lang, image_count
  from public.events
  where view_slug = p_slug
    and expires_at > now();
$$;

revoke all on function public.get_event(text) from public;
grant execute on function public.get_event(text) to anon, authenticated;
