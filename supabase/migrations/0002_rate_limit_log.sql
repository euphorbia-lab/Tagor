-- Rate-limit log for the create endpoint. Stores only a salted hash of the IP,
-- never the raw IP. Written and read by the service role only (RLS on, no policies).
create table public.create_log (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index create_log_ip_time_idx on public.create_log (ip_hash, created_at);

alter table public.create_log enable row level security;
-- No policies: only the service role (server-side) can touch this.
