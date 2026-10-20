-- スマロボの作業を時短ヒーローとは別のカテゴリとして分ける
update public.work_categories set sort_order = sort_order + 1 where sort_order >= 2;

insert into public.work_categories (name, description, sort_order) values
  ('スマロボ', 'smart-robot / sumarobo / スマロボ向けの検討・AWS 環境・本番準備など（tsh_core 上の作業でもスマロボ向けならこちら）', 2);

update public.work_sessions s
set category_id = (select id from public.work_categories where name = 'スマロボ')
where s.subject in ('smart-robot', 'sumarobo') or s.description like '%スマロボ%';
