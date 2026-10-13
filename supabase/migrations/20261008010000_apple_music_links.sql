-- その日に聴いた・残しておきたい Apple Music のリンク。ふつうのリンク（links）とは分け、
-- 1日のページの「今日の音楽」の下に埋め込みプレーヤーで出す

create table public.apple_music_links (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  url text not null check (url ~ '^https://music\.apple\.com/'),
  title text,
  artist text,
  note text,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.apple_music_links is 'その日に聴いた・残しておきたい Apple Music のリンク（曲・アルバム・プレイリストなど）';
comment on column public.apple_music_links.url is 'music.apple.com の共有リンク。曲・アルバム・プレイリストは画面で埋め込みプレーヤーにする';
comment on column public.apple_music_links.title is '曲名・アルバム名・プレイリスト名。埋め込めないページのときに見出しに使う';
comment on column public.apple_music_links.artist is 'アーティスト名';
comment on column public.apple_music_links.note is 'なぜ残したか・どんな場面で聴いたか などの一言';
create index apple_music_links_day_idx on public.apple_music_links (day, created_at);

alter table public.apple_music_links enable row level security;
revoke all on public.apple_music_links from anon, authenticated, service_role;
grant select on public.apple_music_links to service_role;
create trigger set_updated_at before update on public.apple_music_links
  for each row execute function public.set_updated_at();
