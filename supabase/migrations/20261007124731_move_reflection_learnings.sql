-- 学びの種類「振り返り」の記録を、振り返り（kind = lesson）に移し、学びの種類から「振り返り」をなくす。
-- 学びと振り返りを区別する：学びは知識・気づき・やり方、自分の行動を振り返ったものは振り返り。

create temporary table moved on commit drop as
select l.id as learning_id, gen_random_uuid() as reflection_id, l.*
from public.learnings l
where l.kind = 'reflection';

insert into public.reflections (id, day, kind, content, project_id, media_id, sort_order, source, is_private, created_at, updated_at)
select
  m.reflection_id, m.day, 'lesson', m.title || '：' || m.insight, m.project_id, m.media_id,
  row_number() over (partition by m.day order by m.created_at) - 1,
  m.source, m.is_private, m.created_at, m.updated_at
from moved m;

insert into public.reflection_people (reflection_id, person_id)
select m.reflection_id, lp.person_id
from moved m join public.learning_people lp on lp.learning_id = m.learning_id;

delete from public.learnings where kind = 'reflection';
drop table moved;

-- 使われなくなったタグは消す
delete from public.tags t where not exists (select 1 from public.learning_tags lt where lt.tag_id = t.id);

alter type public.learning_kind rename to learning_kind_old;
create type public.learning_kind as enum (
  'knowledge',  -- 知識・用語
  'insight',    -- 気づき・考え方
  'practice'    -- 仕事のやり方・手順
);
alter table public.learnings alter column kind type public.learning_kind using kind::text::public.learning_kind;
drop type public.learning_kind_old;
