-- 振り返りに「教訓」（自分の行動から得た、次に活かすこと）を足す。
-- 学びの種類「振り返り」はやめ、次のマイグレーションでその記録を振り返りに移す。
alter type public.reflection_kind add value 'lesson' after 'carried_over';

alter table public.reflections add column media_id uuid references public.media (id) on delete set null;
comment on column public.reflections.media_id is '本や番組に関わる振り返り（読書中に気づいた教訓など）';
create index reflections_media_idx on public.reflections (media_id);
