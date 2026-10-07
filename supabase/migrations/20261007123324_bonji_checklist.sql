-- 凡事徹底のチェックリスト。習慣（habits）に印を付けて区別し、日ごとのチェックは habit_checks に手で入れる。
-- 項目は終わりの日を決めずに続けるので、end_on は空でもよいことにする。

alter table public.habits drop constraint habits_check;
alter table public.habits alter column end_on drop not null;
alter table public.habits add constraint habits_period check (end_on is null or end_on >= start_on);
comment on column public.habits.end_on is '終了日。空なら続けている（凡事徹底のチェックリストの項目など）';

alter table public.habits
  add column in_checklist boolean not null default false,
  add column sort_order smallint not null default 0;
comment on column public.habits.in_checklist is '凡事徹底のチェックリストに出す項目か';

-- 終了日が空の習慣は、今日（日本時間）までを数える
create or replace view public.habit_days with (security_invoker = true) as
select
  h.id as habit_id,
  d::date as day,
  coalesce(hc.done, false)
    or exists (
      select 1 from public.workouts w
      where w.day = d::date and w.type = any (h.workout_types)
    ) as done
from public.habits h
cross join lateral generate_series(
  h.start_on,
  coalesce(h.end_on, (now() at time zone 'Asia/Tokyo')::date),
  interval '1 day'
) as d
left join public.habit_checks hc on hc.habit_id = h.id and hc.day = d::date;

insert into public.habits (name, start_on, in_checklist, sort_order) values
  ('3:30 までに起床する', '2026-10-07', true, 1),
  ('5時間以上勉強する', '2026-10-07', true, 2);
