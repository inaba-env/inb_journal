-- 一句（自由律俳句）は記録しない
alter table public.days drop column haiku;
comment on column public.days.is_private is 'mood を非公開にするか';
