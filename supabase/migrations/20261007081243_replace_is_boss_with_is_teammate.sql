-- 「上司かどうか」ではなく「同じチーム（システムチーム）かどうか」を持つ。
-- 上司などの役割は relation に書く。

alter table public.people drop constraint people_company_only;
alter table public.people drop column is_boss;
alter table public.people add column is_teammate boolean;

alter table public.people add constraint people_company_only check (
  category = 'company' or (seniority is null and is_teammate is null)
);

comment on column public.people.is_teammate is '自分と同じチーム（システムチーム）か。会社の人のときだけ。分からなければ null';

-- 記録に「システムチーム」「チームメンバー」と書かれている人
update public.people set is_teammate = true where name in ('宮田さん', '岳');
