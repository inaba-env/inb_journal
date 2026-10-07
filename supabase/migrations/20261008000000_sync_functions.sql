-- ~/.secretary/bin/journal-sync.py が Data API（rpc）で呼ぶ、日単位の置き換え関数。
-- テーブルへの書き込み権限は service_role に与えず、この関数を呼ぶ権限だけを与える。
-- psql で直接書いていたときの専用ユーザー cc_writer は使わなくなったので消す。

-- Claude Code のタイムライン。その日の source = 'claude_code' の行を丸ごと置き換える
create function public.replace_work_sessions(p_day date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.days (day) values (p_day) on conflict do nothing;
  delete from public.work_sessions where day = p_day and source = 'claude_code';
  insert into public.work_sessions (day, started_at, ended_at, category_id, subject, description)
  select p_day, r.started_at, r.ended_at, c.id, nullif(r.subject, ''), r.description
  from jsonb_to_recordset(p_rows)
    as r(started_at timestamptz, ended_at timestamptz, category text, subject text, description text)
  left join public.work_categories c on c.name = r.category;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- GitHub での作業。その日の行を丸ごと置き換える
create function public.replace_github_activities(p_day date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.days (day) values (p_day) on conflict do nothing;
  delete from public.github_activities where day = p_day;
  insert into public.github_activities (day, occurred_at, kind, repo, number, sha, title, url)
  select p_day, r.occurred_at, r.kind, r.repo, r.number, r.sha, r.title, r.url
  from jsonb_to_recordset(p_rows)
    as r(occurred_at timestamptz, kind text, repo text, number integer, sha text, title text, url text);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.replace_work_sessions(date, jsonb) from public, anon, authenticated;
revoke execute on function public.replace_github_activities(date, jsonb) from public, anon, authenticated;
grant execute on function public.replace_work_sessions(date, jsonb) to service_role;
grant execute on function public.replace_github_activities(date, jsonb) to service_role;

-- cc_writer を消す
drop policy cc_writer_read on public.work_categories;
drop policy cc_writer_read on public.projects;
drop policy cc_writer_read on public.days;
drop policy cc_writer_insert on public.days;
drop policy cc_writer_read on public.work_sessions;
drop policy cc_writer_insert on public.work_sessions;
drop policy cc_writer_delete on public.work_sessions;
drop policy cc_writer_read on public.github_activities;
drop policy cc_writer_insert on public.github_activities;
drop policy cc_writer_delete on public.github_activities;
revoke all on public.work_categories, public.projects, public.days, public.work_sessions, public.github_activities from cc_writer;
revoke usage on schema public from cc_writer;
drop role cc_writer;
