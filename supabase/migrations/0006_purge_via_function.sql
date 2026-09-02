-- Move the daily purge from raw SQL to the purge-expired edge function.
--
-- 0003 deleted expired rows directly. That cannot work once events own images:
-- Supabase blocks direct DELETE on storage tables (storage.protect_delete), so
-- removing objects must go through the Storage API. Deleting rows in SQL would
-- have quietly orphaned every image, breaking the promise that an event fully
-- deletes itself.
--
-- The function deletes images first, then rows, then stale rate-limit entries.
--
-- The bearer token below is the project's ANON key. It is public by design and
-- already ships in the browser bundle, so it is not a secret. The function only
-- ever deletes already-expired data, so invoking it early achieves nothing.

create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('tagor-purge');
exception
  when others then null;
end $$;

select cron.schedule(
  'tagor-purge',
  '15 3 * * *',
  $job$
    select net.http_post(
      url := 'https://tsnmymvglyascbcfrvay.supabase.co/functions/v1/purge-expired',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzbm15bXZnbHlhc2NiY2ZydmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDY1NjEsImV4cCI6MjEwMjQ4MjU2MX0.eF--KCjc9GZ2OIDIVt1O7bNpx0C7zG6iCnzC-ITWkNM',
        'content-type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $job$
);
