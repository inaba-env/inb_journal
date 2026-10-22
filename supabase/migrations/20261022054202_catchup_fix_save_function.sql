-- save_catchup_report の初版が WITH ORDINALITY と列定義を一緒に使っていて動かなかったので作り直す
create or replace function public.save_catchup_report(p_kind text, p_period_start date, p_period_end date,
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
