-- 運動を「1回の運動（activities）」と、種類ごとの中身（runs / workouts）に分ける。
-- activities は日付・種類・時刻など全種類に共通することだけを持ち、
-- ランの距離は runs、筋トレの種目・セット・回数は workouts（種目ごとに1行）に入れる。

-- 1. 今の workouts を activities に名前を変える
alter table public.workouts rename to activities;
alter table public.activities rename constraint workouts_pkey to activities_pkey;
alter table public.activities rename constraint workouts_day_fkey to activities_day_fkey;
alter table public.activities rename constraint workouts_time_range to activities_time_range;
alter index public.workouts_day_idx rename to activities_day_idx;
alter type public.workout_type rename to activity_type;
alter table public.habits rename column workout_types to activity_types;
comment on table public.activities is '1回の運動。種類ごとの中身は runs（ラン）/ workouts（筋トレ）に入れる';
comment on column public.habits.activity_types is
  'この種類の運動を activities に記録した日は達成とみなす。null なら habit_checks で手動チェック';

-- 子テーブルが種類の合う運動にだけつながるように、(id, type) で参照できるようにする
alter table public.activities add constraint activities_id_type_key unique (id, type);

-- 2. ラン：1回のランに1行
create table public.runs (
  activity_id uuid primary key,
  type public.activity_type not null default 'run' check (type = 'run'),
  distance_km numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (activity_id, type) references public.activities (id, type) on delete cascade
);
comment on table public.runs is 'ランの中身。activities（type = run）1行につき1行';

-- 3. 筋トレ：1回の筋トレの種目ごとに1行
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  type public.activity_type not null default 'strength' check (type = 'strength'),
  sort_order smallint not null default 0,
  exercise text not null,
  sets smallint,
  reps smallint,
  weight_kg numeric(5, 1),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (activity_id, type) references public.activities (id, type) on delete cascade
);
comment on table public.workouts is '筋トレの種目。activities（type = strength）1行に種目の数だけ並ぶ';
comment on column public.workouts.exercise is '種目（腕立て、チューブ など）。表記は既存の行に合わせる';
comment on column public.workouts.reps is '1セットの回数。分からなければ null';
comment on column public.workouts.weight_kg is '負荷（kg）。自重なら null';
create index workouts_activity_idx on public.workouts (activity_id, sort_order);

do $$
declare
  t text;
begin
  foreach t in array array['runs', 'workouts'] loop
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

-- 4. 今ある記録を移す
insert into public.runs (activity_id, distance_km)
select id, distance_km from public.activities where type = 'run';

alter table public.activities drop column distance_km;

-- 筋トレは note に文章で書いていた種目を行に分け、note には種目以外のことだけ残す
insert into public.workouts (activity_id, sort_order, exercise, sets, reps)
select a.id, v.sort_order, v.exercise, v.sets, v.reps
from public.activities a
join (values
  ('2026-04-15'::date, 1, '腕立て', 3, 10),
  ('2026-04-24'::date, 1, '腕立て', 3, 10),
  ('2026-04-24'::date, 2, 'チューブ', 3, null),
  ('2026-05-12'::date, 1, '腕立て', 2, null),
  ('2026-05-12'::date, 2, 'チューブ', 2, null),
  ('2026-05-13'::date, 1, '腕立て', 4, null),
  ('2026-05-13'::date, 2, 'チューブ', 3, null)
) as v (day, sort_order, exercise, sets, reps) on v.day = a.day
where a.type = 'strength';

update public.activities a
set note = v.note
from (values
  ('2026-04-15'::date, 'プロテインあり'),
  ('2026-04-24'::date, 'プロテイン摂取'),
  ('2026-05-12'::date, '朝筋トレ。プロテイン1杯'),
  ('2026-05-13'::date, 'プロテイン1杯')
) as v (day, note)
where a.day = v.day and a.type = 'strength';
