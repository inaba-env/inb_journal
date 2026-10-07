-- 平均心拍と消費カロリーは Garmin がランでも筋トレでも出すので、運動ごとの共通の列として activities に持つ
alter table public.activities
  add column avg_heart_rate smallint check (avg_heart_rate > 0),
  add column calories integer check (calories >= 0);
comment on column public.activities.avg_heart_rate is '平均心拍（bpm）。分からなければ null';
comment on column public.activities.calories is '消費カロリー（kcal）。分からなければ null';

update public.activities
set avg_heart_rate = 130,
    calories = 652,
    note = '中川区。走りながら COTEN RADIO（民主主義）を聴いた'
where day = '2026-10-08' and type = 'run' and source = 'Garmin のスクショ';
