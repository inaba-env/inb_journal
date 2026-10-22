-- キャッチアップ（技術情報の収集）。~/.secretary/bin/catchup.py が集めて Claude に選ばせ、関数 save_catchup_report で入れる
-- 週次レポート（月曜9時に前の週の分）と、緊急の脆弱性の通知（毎朝、該当があった日だけ）の2種類。
-- 日の記録ではないので days にはぶら下げない

create table public.catchup_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('weekly', 'alert')),
  period_start date not null,
  period_end date not null,
  headline text,
  generated_at timestamptz not null default now(),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, period_start)
);
comment on table public.catchup_reports is 'キャッチアップのレポート。週次（weekly）は1週1行、緊急の脆弱性（alert）は1日1行';
comment on column public.catchup_reports.period_start is '週次は対象の週の月曜、alert はその日';
comment on column public.catchup_reports.headline is 'その回の全体のまとめ（2〜3文）';

create table public.catchup_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.catchup_reports (id) on delete cascade,
  section text not null check (section in ('vuln', 'ai_tools', 'discussion', 'interest')),
  sort_order integer not null,
  featured boolean not null default false,
  title text not null,
  summary text not null,
  pro text,
  con text,
  voices text,
  action text,
  severity text,
  url text,
  thread_url text,
  source text,
  external_id text,
  feedback text check (feedback in ('useful', 'skip')),
  feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catchup_items_report_id_idx on public.catchup_items (report_id);
create unique index catchup_items_external_id_key on public.catchup_items (report_id, external_id);
comment on table public.catchup_items is 'レポートの1件。section は vuln（脆弱性）/ ai_tools / discussion（海外エンジニアの議論）/ interest（その他の興味ごと）';
comment on column public.catchup_items.featured is '週次のトップ（詳しく出す）か';
comment on column public.catchup_items.pro is '議論の賛成側の主張';
comment on column public.catchup_items.con is '議論の反対側の主張';
comment on column public.catchup_items.voices is '実際に使った人の声';
comment on column public.catchup_items.action is '自分の環境で試すなら何をするか。脆弱性なら何をすればいいか';
comment on column public.catchup_items.url is '元の記事・リリース・勧告';
comment on column public.catchup_items.thread_url is '議論のスレッド（Hacker News・Reddit など）';
comment on column public.catchup_items.external_id is 'CVE・GHSA などの ID。同じ alert に同じものを二重に入れないため';
comment on column public.catchup_items.feedback is '本人の反応（useful 役に立った / skip いらない）。次の週の選び方に使う';

alter table public.catchup_reports enable row level security;
alter table public.catchup_items enable row level security;
revoke all on public.catchup_reports, public.catchup_items from anon, authenticated, service_role;
grant select on public.catchup_reports, public.catchup_items to service_role;
create trigger set_updated_at before update on public.catchup_reports
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.catchup_items
  for each row execute function public.set_updated_at();

-- レポートを入れる。週次は同じ週の分を丸ごと置き換える（やり直したとき用）。
-- alert は同じ日の行に足していき、external_id が同じものは入れ直さない（同じ日に2回動いたとき用）
create function public.save_catchup_report(p_kind text, p_period_start date, p_period_end date,
  p_headline text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid;
  base integer;
begin
  if p_kind = 'weekly' then
    delete from public.catchup_reports where kind = 'weekly' and period_start = p_period_start;
  end if;
  insert into public.catchup_reports (kind, period_start, period_end, headline, generated_at)
  values (p_kind, p_period_start, p_period_end, p_headline, now())
  on conflict (kind, period_start) do update
    set headline = coalesce(excluded.headline, catchup_reports.headline), generated_at = now()
  returning id into rid;
  select coalesce(max(i.sort_order), 0) into base from public.catchup_items i where i.report_id = rid;
  insert into public.catchup_items (report_id, section, sort_order, featured, title, summary,
    pro, con, voices, action, severity, url, thread_url, source, external_id)
  select rid, r.section, base + e.ord::integer, coalesce(r.featured, false), r.title, r.summary,
    nullif(r.pro, ''), nullif(r.con, ''), nullif(r.voices, ''), nullif(r.action, ''), nullif(r.severity, ''),
    nullif(r.url, ''), nullif(r.thread_url, ''), nullif(r.source, ''), nullif(r.external_id, '')
  from jsonb_array_elements(p_items) with ordinality as e(item, ord)
  cross join lateral jsonb_to_record(e.item)
    as r(section text, featured boolean, title text, summary text, pro text, con text, voices text,
         action text, severity text, url text, thread_url text, source text, external_id text)
  on conflict (report_id, external_id) do nothing;
  return rid;
end;
$$;

-- 画面の「役に立った／いらない」。p_feedback が null なら取り消す
create function public.set_catchup_feedback(p_item_id uuid, p_feedback text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.catchup_items
  set feedback = p_feedback, feedback_at = case when p_feedback is null then null else now() end
  where id = p_item_id;
$$;

revoke execute on function public.save_catchup_report(text, date, date, text, jsonb) from public, anon, authenticated;
revoke execute on function public.set_catchup_feedback(uuid, text) from public, anon, authenticated;
grant execute on function public.save_catchup_report(text, date, date, text, jsonb) to service_role;
grant execute on function public.set_catchup_feedback(uuid, text) to service_role;
