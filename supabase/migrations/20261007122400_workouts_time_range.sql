-- 運動をタイムラインに載せるため、開始・終了時刻を持つ
alter table public.workouts
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add constraint workouts_time_range check (ended_at is null or started_at is null or ended_at > started_at);
comment on column public.workouts.started_at is '開始時刻。分からなければ null（タイムラインには出ない）';
comment on column public.workouts.ended_at is '終了時刻。duration_min だけ分かるときは started_at + duration_min で入れる';
