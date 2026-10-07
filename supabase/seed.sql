-- ローカル開発用のサンプルデータ（supabase db reset で投入される）
insert into learnings (learned_on, title, body, tags) values
  ('2026-10-07', '「レンダリング」はテンプレート埋め込みにも使う', 'Jinja2 の template.render() など。雛形がなければ「生成」のほうが正確', array['用語', 'テンプレート']);
insert into learnings (title, is_private) values ('非公開の学び', true);

insert into sleep_logs (sleep_date, bed_at, wake_at, quality) values
  ('2026-10-06', '2026-10-05 23:40+09', '2026-10-06 06:50+09', 4),
  ('2026-10-07', '2026-10-07 00:30+09', '2026-10-07 06:40+09', 3);

with h as (insert into habits (name, start_on, end_on) values ('毎日10分読書', '2026-10-01', '2026-10-31') returning id)
insert into habit_checks (habit_id, checked_on)
select id, d::date from h, generate_series('2026-10-01'::date, '2026-10-06', '1 day') d where extract(day from d) <> 4;

with m as (insert into metrics (key, name, unit) values ('weight', '体重', 'kg') returning id)
insert into metric_logs (metric_id, logged_on, value) select id, '2026-10-07', 68.2 from m;
