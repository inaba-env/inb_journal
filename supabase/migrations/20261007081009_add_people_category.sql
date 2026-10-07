-- 人の分類
create type public.person_category as enum (
  'family',     -- 家族
  'boss',       -- 上司
  'senior',     -- 先輩
  'peer',       -- 同期
  'colleague',  -- 同僚・会社の人
  'junior',     -- 後輩
  'customer',   -- お客さん
  'other'       -- その他
);

alter table public.people add column category public.person_category;
comment on column public.people.category is '分類。分からなければ null';
comment on column public.people.relation is '分類より細かい関係（祖母、システムチームのリーダーなど）';
create index people_category_idx on public.people (category);
