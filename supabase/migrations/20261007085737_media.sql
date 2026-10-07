-- 読んだ・聞いたもの（本・Audible・ポッドキャスト・教材）。
-- 時間の記録（time_logs）と学び（learnings）をここにつなぎ、「何を読んで何を学んだか」をたどれるようにする。

create type public.media_kind as enum (
  'book',       -- 本（紙・電子）
  'audiobook',  -- Audible などの音声の本
  'podcast',    -- ポッドキャストの番組
  'course'      -- 教材・研修
);

create type public.media_status as enum ('planned', 'in_progress', 'finished', 'dropped');

create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null,
  title text not null,
  author text,
  status public.media_status not null default 'in_progress',
  started_on date,
  finished_on date,
  note_path text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, title),
  check (finished_on is null or started_on is null or finished_on >= started_on)
);
comment on column public.media.author is '著者。ポッドキャストならパーソナリティや制作元';
comment on column public.media.note_path is '読書メモの場所（~/.secretary からの相対パス）';

alter table public.time_logs add column media_id uuid references public.media (id) on delete set null;
comment on column public.time_logs.media_id is '読書・Audible・ポッドキャストのとき、何を読んだ・聞いたか。content には章やエピソード名を書く';
create index time_logs_media_idx on public.time_logs (media_id);

alter table public.learnings add column media_id uuid references public.media (id) on delete set null;
comment on column public.learnings.media_id is 'その本・番組から得た学びのとき';
create index learnings_media_idx on public.learnings (media_id);

alter table public.media enable row level security;
revoke all on public.media from anon, authenticated, service_role;
grant select on public.media to service_role;
create trigger set_updated_at before update on public.media
  for each row execute function public.set_updated_at();
