-- 構造化スキーマ
-- Markdown の本文をそのまま持つのをやめ、AI が中身を読んで項目・テーブルに分けて入れる形にする。
-- すべての記録は「日付（days）」にぶら下げ、日ごとにたどれるようにする。
-- 構造化のルールは docs/recording-rules.md にまとめる。

drop table if exists public.metric_logs, public.metrics, public.habit_checks, public.habits,
  public.sleep_logs, public.learnings cascade;

-- 選択肢
create type public.learning_kind as enum (
  'knowledge',  -- 知識・用語
  'insight',    -- 気づき・考え方
  'practice',   -- 仕事のやり方・手順
  'reflection'  -- 自分の行動の振り返り
);

create type public.reflection_kind as enum (
  'highlight',    -- 今日のハイライト
  'thought',      -- 考えたこと
  'gratitude',    -- 感謝
  'quiet_good',   -- 静かな良いこと
  'went_well',    -- できたこと
  'went_badly',   -- うまくいかなかったこと
  'carried_over', -- 繰り越したタスク（reason に理由）
  'catch_up',     -- キャッチアップ
  'music'         -- 今日の音楽
);

create type public.commitment_result as enum ('done', 'partial', 'not_done');

create type public.workout_type as enum ('run', 'walk', 'strength', 'stretch', 'other');

-- 日付（すべての記録の親）
create table public.days (
  day date primary key,
  weekday smallint generated always as (extract(isodow from day)::smallint) stored,
  mood text,
  haiku text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.days is '日付。記録を入れる前に必ずその日の行を作る';
comment on column public.days.is_private is 'mood と haiku を非公開にするか';

-- マスター
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.projects is '案件・プロジェクト（時短ヒーロー浜田など）';

create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  relation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.people is '記録に出てくる人。人名を含む記録は非公開にする';

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 学び
create table public.learnings (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  title text not null,
  insight text not null,
  kind public.learning_kind not null,
  context text,
  next_action text,
  project_id uuid references public.projects (id) on delete set null,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.learnings.title is '一言の見出し';
comment on column public.learnings.insight is '学びの中身（1〜3文）。入力にないことは足さない';
comment on column public.learnings.context is 'どの場面で得たか（朝礼、案件対応中など）';
comment on column public.learnings.next_action is '次にどう活かすか。入力に書いてあるときだけ';
comment on column public.learnings.source is '元ファイルのパスなど、どこから来たか';
create index learnings_day_idx on public.learnings (day desc);
create index learnings_project_idx on public.learnings (project_id);

create table public.learning_tags (
  learning_id uuid not null references public.learnings (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (learning_id, tag_id)
);
create index learning_tags_tag_idx on public.learning_tags (tag_id);

create table public.learning_people (
  learning_id uuid not null references public.learnings (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (learning_id, person_id)
);
create index learning_people_person_idx on public.learning_people (person_id);

-- ジャーナルの振り返り項目
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  kind public.reflection_kind not null,
  content text not null,
  reason text,
  project_id uuid references public.projects (id) on delete set null,
  sort_order smallint not null default 0,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.reflections.reason is 'carried_over のときの理由';
create index reflections_day_idx on public.reflections (day desc, kind);
create index reflections_project_idx on public.reflections (project_id);

create table public.reflection_people (
  reflection_id uuid not null references public.reflections (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (reflection_id, person_id)
);
create index reflection_people_person_idx on public.reflection_people (person_id);

-- 明日に向けての約束と、その振り返り（PDCA）
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  made_on date not null references public.days (day),
  content text not null,
  project_id uuid references public.projects (id) on delete set null,
  result public.commitment_result,
  review_note text,
  reviewed_on date references public.days (day),
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.commitments is '「明日に向けて」の約束。翌日以降のジャーナルで result（Check）と review_note（Act）を埋める';
create index commitments_made_on_idx on public.commitments (made_on desc);
create index commitments_reviewed_on_idx on public.commitments (reviewed_on);
create index commitments_project_idx on public.commitments (project_id);

-- 睡眠（day は起きた日）
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  day date not null unique references public.days (day),
  bed_at timestamptz,
  wake_at timestamptz not null,
  duration_min integer generated always as ((extract(epoch from (wake_at - bed_at)) / 60)::integer) stored,
  quality smallint check (quality between 1 and 5),
  note text,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bed_at is null or wake_at > bed_at)
);
comment on column public.sleep_logs.bed_at is '寝た時刻。分からなければ null（起床時刻だけでも記録する）';

-- ワークアウト
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  type public.workout_type not null,
  distance_km numeric(6, 2),
  duration_min integer,
  note text,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workouts_day_idx on public.workouts (day desc);

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
  day date not null references public.days (day),
  done boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index habit_checks_day_idx on public.habit_checks (day);

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
  day date not null references public.days (day),
  value numeric not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_id, day)
);
create index metric_logs_day_idx on public.metric_logs (day);

-- 権限：anon / authenticated は何もできない。Web（service_role）は読むだけ。書き込みは MCP（postgres）から
do $$
declare
  t text;
begin
  foreach t in array array[
    'days', 'projects', 'people', 'tags',
    'learnings', 'learning_tags', 'learning_people',
    'reflections', 'reflection_people', 'commitments',
    'sleep_logs', 'workouts', 'habits', 'habit_checks', 'metrics', 'metric_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, service_role', t);
    execute format('grant select on public.%I to service_role', t);
    if t not in ('learning_tags', 'learning_people', 'reflection_people') then
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        t
      );
    end if;
  end loop;
end;
$$;
