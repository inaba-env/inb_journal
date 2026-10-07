-- 「書籍・ポッドキャスト」を読書・Audible・ポッドキャストに分ける。
-- 過去の記録はどれだったか分からないので、旧カテゴリのまま残し、今後は使わない。

alter table public.time_categories add column is_active boolean not null default true;
comment on column public.time_categories.is_active is 'false のカテゴリは過去の記録用。新しい記録には使わない';

update public.time_categories set is_active = false where name = '書籍・ポッドキャスト';

update public.time_categories set sort_order = sort_order + 2 where sort_order >= 3;
insert into public.time_categories (name, sort_order) values
  ('読書', 2), ('Audible', 3), ('ポッドキャスト', 4);
