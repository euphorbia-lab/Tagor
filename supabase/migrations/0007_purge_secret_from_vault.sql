-- Authenticate the daily purge call with a shared secret.
--
-- 0006 called purge-expired with only the anon key, which is public, so anyone
-- could trigger the function. The function now refuses any call without the
-- right x-purge-secret header. This job reads that secret from Vault at run
-- time, so the value never appears in this file or in cron.job.
--
-- Before applying, create the secret (same value as the PURGE_SECRET function
-- secret):
--   select vault.create_secret('<value>', 'purge_secret');
--
-- The bearer token is still the project's ANON key, which is public by design
-- (see 0006).

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
        'x-purge-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'purge_secret'),
        'content-type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $job$
);
