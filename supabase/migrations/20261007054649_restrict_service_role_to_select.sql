-- ホスト版の Supabase では、新しいテーブルに service_role の全権限がデフォルトで付く。
-- Web（秘密鍵）は読むだけなので SELECT 以外を外し、鍵が漏れても書き換えられないようにする。
-- 書き込みは Supabase MCP（postgres ロール）から行う。

do $$
declare
  t text;
begin
  foreach t in array array['learnings', 'sleep_logs', 'habits', 'habit_checks', 'metrics', 'metric_logs'] loop
    execute format('revoke all on public.%I from service_role', t);
    execute format('grant select on public.%I to service_role', t);
  end loop;
end;
$$;
