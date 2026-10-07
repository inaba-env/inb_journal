-- 寝た時点で就寝時刻だけ先に入れ、起きたら起床時刻を埋められるようにする
alter table public.sleep_logs alter column wake_at drop not null;
alter table public.sleep_logs add constraint sleep_logs_has_time check (bed_at is not null or wake_at is not null);
comment on column public.sleep_logs.wake_at is '起床時刻。就寝時刻だけ先に入れたときは、起きるまで空';
