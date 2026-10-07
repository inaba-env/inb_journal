-- 人の分類を「どこの人か」「会社での上下」「上司かどうか」の3つに分ける。
-- 1つの選択肢に混ぜると、上司・先輩・同僚が重なるため。

create type public.person_group as enum (
  'family',   -- 家族
  'company',  -- 会社の人
  'customer', -- お客さん
  'other'     -- その他
);

create type public.person_seniority as enum (
  'senior', -- 先輩
  'peer',   -- 同期
  'junior'  -- 後輩
);

alter table public.people
  add column group_kind public.person_group,
  add column seniority public.person_seniority,
  add column is_boss boolean not null default false;

update public.people set
  group_kind = case category
    when 'family' then 'family'
    when 'customer' then 'customer'
    when 'other' then 'other'
    when null then null
    else 'company'
  end::public.person_group,
  seniority = case category
    when 'boss' then 'senior'
    when 'senior' then 'senior'
    when 'peer' then 'peer'
    when 'junior' then 'junior'
  end::public.person_seniority,
  is_boss = (category = 'boss');

drop index public.people_category_idx;
alter table public.people drop column category;
drop type public.person_category;
alter table public.people rename column group_kind to category;

alter table public.people add constraint people_company_only check (
  category = 'company' or (seniority is null and not is_boss)
);

comment on column public.people.category is 'どこの人か。分からなければ null';
comment on column public.people.seniority is '会社の人のときだけ。先輩・同期・後輩。分からなければ null';
comment on column public.people.is_boss is '上司かどうか。会社の人のときだけ';
create index people_category_idx on public.people (category);
