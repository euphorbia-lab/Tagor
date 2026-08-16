-- Scheduled cleanup: delete events past their expiry, and old rate-limit rows.
-- Runs daily at 03:15 UTC via pg_cron.
create extension if not exists pg_cron;

select cron.schedule(
  'tagor-purge',
  '15 3 * * *',
  $$
    delete from public.events where expires_at < now();
    delete from public.create_log where created_at < now() - interval '2 days';
  $$
);
