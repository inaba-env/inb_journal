-- inb_journal 初期スキーマ
-- 書き込みは Claude Code から Supabase MCP で行い、Web は秘密鍵でサーバー側から読むだけ。
-- そのため anon / authenticated には一切権限を与えず、RLS も有効にしたうえでポリシーを作らない。
-- Web が使う service_role（秘密鍵）には SELECT だけを与える。

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 学び
create table public.learnings (
  id uuid primary key default gen_random_uuid(),
  learned_on date not null default (now() at time zone 'Asia/Tokyo')::date,
  title text not null,
  body text,
  tags text[] not null default '{}',
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learnings_learned_on_idx on public.learnings (learned_on desc);
create index learnings_tags_idx on public.learnings using gin (tags);

-- 睡眠（sleep_date は起きた日）
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  sleep_date date not null unique,
  bed_at timestamptz not null,
  wake_at timestamptz not null,
  duration_min integer generated always as ((extract(epoch from (wake_at - bed_at)) / 60)::integer) stored,
  quality smallint check (quality between 1 and 5),
  note text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (wake_at > bed_at)
);

-- 期間つきの習慣目標
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_on date not null,
  end_on date not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_on >= start_on)
);

create table public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  checked_on date not null,
  done boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, checked_on)
);

-- 汎用の日次記録（体重・歩数など）
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  unit text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metrics (id) on delete cascade,
  logged_on date not null,
  value numeric not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_id, logged_on)
);

do $$
declare
  t text;
begin
  foreach t in array array['learnings', 'sleep_logs', 'habits', 'habit_checks', 'metrics', 'metric_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to service_role', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
