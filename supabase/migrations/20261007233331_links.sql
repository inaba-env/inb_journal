-- その日に参照したリンク・残しておきたいリンク。1日のページの「振り返り」の下に出す

create table public.links (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  url text not null,
  title text,
  note text,
  media_id uuid references public.media (id) on delete set null,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.links is 'その日に参照したリンク・残しておきたいリンク';
comment on column public.links.title is 'ページの題名。無ければ画面では URL をそのまま出す';
comment on column public.links.note is 'なぜ残したか・何に使ったか などの一言';
comment on column public.links.media_id is '教材や本のページのとき、その media につなぐ';
create index links_day_idx on public.links (day, created_at);
create index links_media_idx on public.links (media_id);

alter table public.links enable row level security;
revoke all on public.links from anon, authenticated, service_role;
grant select on public.links to service_role;
create trigger set_updated_at before update on public.links
  for each row execute function public.set_updated_at();
