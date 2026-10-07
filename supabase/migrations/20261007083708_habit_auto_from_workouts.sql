-- 運動の習慣は workouts から自動で達成を判定する。habit_checks に二重に書かない。

alter table public.habits add column workout_types public.workout_type[];
comment on column public.habits.workout_types is
  'この種類の運動を workouts に記録した日は達成とみなす。null なら habit_checks で手動チェック';

-- 習慣ごと・日ごとの達成状況（期間内の全日。未来の日は done = false）
create view public.habit_days with (security_invoker = true) as
select
  h.id as habit_id,
  d::date as day,
  coalesce(hc.done, false)
    or exists (
      select 1 from public.workouts w
      where w.day = d::date and w.type = any (h.workout_types)
    ) as done
from public.habits h
cross join lateral generate_series(h.start_on, h.end_on, interval '1 day') as d
left join public.habit_checks hc on hc.habit_id = h.id and hc.day = d::date;

revoke all on public.habit_days from anon, authenticated, service_role;
grant select on public.habit_days to service_role;

insert into public.habits (name, description, start_on, end_on, workout_types)
values ('毎日なにかしら運動する', '朝ランか筋トレのどちらかをやれば達成', '2026-10-07', '2026-12-31', '{run,strength}');
