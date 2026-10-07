-- その日に書いた記録（学び・振り返り・感謝・音楽）を1つの形にまとめる。
-- 大分類（note_categories）＝画面のセクション、小分類（note_kinds）＝小見出し、記録（notes）＝カード。
-- 種類の追加や名前の変更は行を直すだけで済むよう、enum ではなく表で持つ。

create table public.note_categories (
  key text primary key,
  label text not null,
  sort_order smallint not null default 0,
  content_private boolean not null default false,
  show_kind_headings boolean not null default true,
  show_on_page boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.note_categories.content_private is 'true なら中身は必ず非公開（件数だけ公開）。感謝など';
comment on column public.note_categories.show_kind_headings is '画面で小分類の小見出しを出すか（小分類が1つしかない大分類は出さない）';
comment on column public.note_categories.show_on_page is '1日のページにセクションとして出すか';

create table public.note_kinds (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.note_categories (key),
  key text not null,
  label text not null,
  description text,
  sort_order smallint not null default 0,
  show_when_empty boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_key, key)
);
comment on column public.note_kinds.description is 'どんな記録をこの小分類に入れるか（AI が振り分けに使う）';
comment on column public.note_kinds.show_when_empty is '記録がない日も小見出しを出すか';

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  kind_id uuid not null references public.note_kinds (id),
  title text,
  body text not null,
  context text,
  reason text,
  next_action text,
  media_id uuid references public.media (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  source text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.notes.title is '一言の見出し。学びには付け、振り返りや感謝は空でもよい';
comment on column public.notes.context is 'どの場面のことか（朝礼、案件対応中 など）';
comment on column public.notes.reason is '理由（うまくいかなかったことの理由など）';
comment on column public.notes.next_action is '次にどう活かすか。入力に書いてあるときだけ';
create index notes_day_idx on public.notes (day, kind_id);
create index notes_kind_idx on public.notes (kind_id);
create index notes_media_idx on public.notes (media_id);
create index notes_project_idx on public.notes (project_id);

create table public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (note_id, tag_id)
);
create index note_tags_tag_idx on public.note_tags (tag_id);

create table public.note_people (
  note_id uuid not null references public.notes (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (note_id, person_id)
);
create index note_people_person_idx on public.note_people (person_id);

-- 中身を必ず非公開にする大分類（感謝など）は、入れるときに is_private を true にそろえる
create or replace function public.notes_force_private()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.note_kinds k join public.note_categories c on c.key = k.category_key
    where k.id = new.kind_id and c.content_private
  ) then
    new.is_private = true;
  end if;
  return new;
end;
$$;
revoke execute on function public.notes_force_private() from public, anon, authenticated;
create trigger notes_force_private before insert or update on public.notes
  for each row execute function public.notes_force_private();

do $$
declare
  t text;
begin
  foreach t in array array['note_categories', 'note_kinds', 'notes', 'note_tags', 'note_people'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, service_role', t);
    execute format('grant select on public.%I to service_role', t);
    if t not in ('note_tags', 'note_people') then
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        t
      );
    end if;
  end loop;
end;
$$;

insert into public.note_categories (key, label, sort_order, content_private, show_kind_headings, show_on_page) values
  ('learning', '学び', 1, false, true, true),
  ('reflection', '振り返り', 2, false, true, true),
  ('gratitude', '今日の感謝', 3, true, false, true),
  ('music', '今日の音楽', 4, false, false, false);

insert into public.note_kinds (category_key, key, label, description, sort_order, show_when_empty) values
  ('learning', 'knowledge', '知識', '知らなかった事実・用語・仕組み', 1, true),
  ('learning', 'insight', '気づき', '考え方・ものの見方についての気づき', 2, true),
  ('learning', 'practice', 'やり方', '仕事の進め方・手順・技術的なやり方', 3, true),
  ('reflection', 'good', 'よかったこと', 'できたこと・うまくいったこと・嬉しかったこと', 1, false),
  ('reflection', 'bad', 'うまくいかなかったこと', 'できなかったこと・繰り越したこと。理由は reason に', 2, false),
  ('reflection', 'lesson', '教訓', '自分の行動を振り返って得た、次に活かすこと', 3, false),
  ('reflection', 'thought', '考えたこと', 'その日に考えたこと・感じたこと', 4, false),
  ('gratitude', 'gratitude', '感謝', '感謝したこと', 1, false),
  ('music', 'music', '音楽', 'その日に聴いた・気に入った曲', 1, false);
