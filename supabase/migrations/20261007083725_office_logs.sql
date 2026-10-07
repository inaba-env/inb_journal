-- オフィスに着いた時刻・出た時刻
create table public.office_logs (
  id uuid primary key default gen_random_uuid(),
  day date not null unique references public.days (day),
  arrived_at timestamptz,
  left_at timestamptz,
  stay_min integer generated always as ((extract(epoch from (left_at - arrived_at)) / 60)::integer) stored,
  note text,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (arrived_at is not null or left_at is not null),
  check (arrived_at is null or left_at is null or left_at > arrived_at)
);
comment on table public.office_logs is 'オフィスに着いた・出た時刻。片方だけでも記録する';

alter table public.office_logs enable row level security;
revoke all on public.office_logs from anon, authenticated, service_role;
grant select on public.office_logs to service_role;
create trigger set_updated_at before update on public.office_logs
  for each row execute function public.set_updated_at();
