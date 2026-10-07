-- GitHub での作業（コミット・PR・Issue）。~/.secretary/bin/gh-activity-db.py が gh search で集めて入れる

create table public.github_activities (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.days (day),
  occurred_at timestamptz not null,
  kind text not null check (kind in ('commit', 'pr_opened', 'pr_merged', 'issue_opened')),
  repo text not null,
  number integer,
  sha text,
  title text not null,
  url text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.github_activities is 'GitHub での作業。同じ日の行はスクリプトが丸ごと置き換える';
comment on column public.github_activities.kind is 'commit（既定ブランチに入ったコミット。マージコミットは除く）/ pr_opened / pr_merged / issue_opened';
comment on column public.github_activities.repo is 'owner/name（e-value-inc/tsh_core など）';
create index github_activities_day_idx on public.github_activities (day, occurred_at);

alter table public.github_activities enable row level security;
revoke all on public.github_activities from anon, authenticated, service_role;
grant select on public.github_activities to service_role;
create trigger set_updated_at before update on public.github_activities
  for each row execute function public.set_updated_at();

-- 書き込みは work_sessions と同じ専用ユーザー（cc_writer）で行う
grant select, insert, delete on public.github_activities to cc_writer;
create policy cc_writer_read on public.github_activities for select to cc_writer using (true);
create policy cc_writer_insert on public.github_activities for insert to cc_writer with check (true);
create policy cc_writer_delete on public.github_activities for delete to cc_writer using (true);
