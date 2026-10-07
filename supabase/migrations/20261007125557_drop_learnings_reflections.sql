-- 学び・振り返りは notes に移したので、古いテーブルと種類の型を消す
drop table public.learning_tags, public.learning_people, public.reflection_people;
drop table public.learnings, public.reflections;
drop type public.learning_kind, public.reflection_kind;
