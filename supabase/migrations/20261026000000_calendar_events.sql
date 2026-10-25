-- Google カレンダーの予定。~/.secretary/bin/journal-sync.py が毎時、Calendar API で取って入れる
-- 終日予定と、欠席で返事した予定は入れない
-- 予定は本人にだけ見せるので、is_private は常に true で入れる

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_min integer generated always as ((extract(epoch from (ended_at - started_at)) / 60)::integer) stored,
  title text,
  location text,
  url text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.calendar_events is 'Google カレンダーの予定。同じ日の行はスクリプトが丸ごと置き換える';
comment on column public.calendar_events.url is 'Google カレンダーでその予定を開く URL（htmlLink）';
create index calendar_events_day_idx on public.calendar_events (day, started_at);

alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon, authenticated, service_role;
grant select on public.calendar_events to service_role;
create trigger set_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- その日の行を丸ごと置き換える
create function public.replace_calendar_events(p_day date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.days (day) values (p_day) on conflict do nothing;
  delete from public.calendar_events where day = p_day;
  insert into public.calendar_events (day, started_at, ended_at, title, location, url)
  select p_day, r.started_at, r.ended_at, nullif(r.title, ''), nullif(r.location, ''), r.url
  from jsonb_to_recordset(p_rows)
    as r(started_at timestamptz, ended_at timestamptz, title text, location text, url text);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.replace_calendar_events(date, jsonb) from public, anon, authenticated;
grant execute on function public.replace_calendar_events(date, jsonb) to service_role;
