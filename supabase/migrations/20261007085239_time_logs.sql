-- 学習・自己投資の時間の記録（もとは凡事徹底スプシの「YY年M月【時間】」）

create table public.time_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.time_categories is '時間の記録のカテゴリ。AI はここにある名前だけを使う';

insert into public.time_categories (name, sort_order) values
  ('開発', 1), ('書籍・ポッドキャスト', 2), ('その他インプット', 3),
  ('その他アウトプット', 4), ('ジャーナリング', 5), ('業務', 6);

create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_min integer generated always as ((extract(epoch from (ended_at - started_at)) / 60)::integer) stored,
  category_id uuid references public.time_categories (id),
  content text,
  note text,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at > started_at)
);
comment on column public.time_logs.content is '何をしたか（書名・技術名など）';
comment on column public.time_logs.note is '備考（寝落ち など）';
create index time_logs_day_idx on public.time_logs (day, started_at);
create index time_logs_category_idx on public.time_logs (category_id);

do $$
declare
  t text;
begin
  foreach t in array array['time_categories', 'time_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, service_role', t);
    execute format('grant select on public.%I to service_role', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;
