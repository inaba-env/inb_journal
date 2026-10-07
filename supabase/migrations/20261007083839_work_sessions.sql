-- Claude Code の作業ログから作るタイムライン（もとは凡事徹底スプシの【タイムライン】）

create table public.work_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.work_categories is 'タイムラインのカテゴリ。AI はここにある名前だけを使う';

insert into public.work_categories (name, description, sort_order) values
  ('時短ヒーロー', 'tsh_core / tsh_runner_* / tsh関連 / inb_film（時短ヒーローの動画）/ 時短ヒーローのSSO検証など', 1),
  ('odesser', 'app_odesser', 2),
  ('ナカダイ', 'nakadai / eteras-minutes（ナカダイ議事録）', 3),
  ('鈴木商会', 'app_suzuki_shokai', 4),
  ('CC・トークノート', 'archive/cc / talknote_downloader / トークノートAPI', 5),
  ('資料・検討', '提案資料・検討スライド・ロープレ教材など、顧客向けや社内向けの資料作成', 6),
  ('読書・調査', '読書リスト・リサーチ・ナレッジ整理', 7),
  ('環境・秘書', '開発環境・ツール設定（Aerospace, tmux, Git, 1Password 等）・秘書システム（.secretary）', 8);

create table public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_min integer generated always as ((extract(epoch from (ended_at - started_at)) / 60)::integer) stored,
  category_id uuid references public.work_categories (id),
  subject text,
  project_id uuid references public.projects (id) on delete set null,
  description text not null,
  source text not null default 'claude_code',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at)
);
comment on column public.work_sessions.subject is '案件。リポジトリ名・ツール名・資料名などの短い識別子（tsh_core など）';
comment on column public.work_sessions.source is 'claude_code（ログから自動抽出）など。同じ日・同じ source の行は丸ごと置き換える';
create index work_sessions_day_idx on public.work_sessions (day, started_at);
create index work_sessions_category_idx on public.work_sessions (category_id);
create index work_sessions_project_idx on public.work_sessions (project_id);

do $$
declare
  t text;
begin
  foreach t in array array['work_categories', 'work_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, service_role', t);
    execute format('grant select on public.%I to service_role', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- launchd のスクリプト（cc-timeline-sheet.py）が使う書き込み専用ユーザー。
-- パスワードはマイグレーションに書かず、作成後に別途設定する（~/.secretary/.credentials/ に保存）。
create role cc_writer login noinherit;
grant usage on schema public to cc_writer;
grant select on public.work_categories, public.projects to cc_writer;
grant select, insert, delete on public.work_sessions to cc_writer;
grant select, insert on public.days to cc_writer;

create policy cc_writer_read on public.work_categories for select to cc_writer using (true);
create policy cc_writer_read on public.projects for select to cc_writer using (true);
create policy cc_writer_read on public.days for select to cc_writer using (true);
create policy cc_writer_insert on public.days for insert to cc_writer with check (true);
create policy cc_writer_read on public.work_sessions for select to cc_writer
  using (source = 'claude_code');
create policy cc_writer_insert on public.work_sessions for insert to cc_writer
  with check (source = 'claude_code');
create policy cc_writer_delete on public.work_sessions for delete to cc_writer
  using (source = 'claude_code');
