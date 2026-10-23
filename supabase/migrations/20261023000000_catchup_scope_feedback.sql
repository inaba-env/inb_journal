-- キャッチアップの反応を「関心あり / 知っておくべき / 範囲外」の3つと一言メモにし、
-- 反応から育てる「関心の範囲」（catchup_scope、1行だけ）を持つ

alter table public.catchup_items drop constraint catchup_items_feedback_check;
update public.catchup_items set feedback = case feedback when 'useful' then 'interested' when 'skip' then 'out_of_scope' end
  where feedback is not null;
alter table public.catchup_items add constraint catchup_items_feedback_check
  check (feedback in ('interested', 'should_know', 'out_of_scope'));
alter table public.catchup_items add column feedback_note text;
comment on column public.catchup_items.feedback is '本人の反応（interested 関心あり / should_know 知っておくべき / out_of_scope 範囲外）。次の週の選び方と関心の範囲に使う';
comment on column public.catchup_items.feedback_note is '反応に添えた一言メモ（「PHP は全部欲しい」など）';

drop function public.set_catchup_feedback(uuid, text);
-- 画面の反応とメモ。p_feedback が null なら反応を取り消す（メモはそのまま残す）
create function public.set_catchup_feedback(p_item_id uuid, p_feedback text, p_note text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.catchup_items
  set feedback = p_feedback, feedback_note = nullif(btrim(p_note), ''),
    feedback_at = case when p_feedback is null and nullif(btrim(p_note), '') is null then null else now() end
  where id = p_item_id;
$$;
revoke execute on function public.set_catchup_feedback(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_catchup_feedback(uuid, text, text) to service_role;

create table public.catchup_scope (
  id integer primary key default 1 check (id = 1),
  body text not null,
  feedback_until timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.catchup_scope is '関心の範囲（1行だけ）。catchup.py が反応とメモから毎週まとめ直し、選ぶ基準にする';
comment on column public.catchup_scope.feedback_until is 'どの時刻までの反応を反映したか';
alter table public.catchup_scope enable row level security;
revoke all on public.catchup_scope from anon, authenticated, service_role;
grant select on public.catchup_scope to service_role;

create function public.save_catchup_scope(p_body text, p_feedback_until timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catchup_scope (id, body, feedback_until, updated_at) values (1, p_body, p_feedback_until, now())
  on conflict (id) do update set body = excluded.body, feedback_until = excluded.feedback_until, updated_at = now();
$$;
revoke execute on function public.save_catchup_scope(text, timestamptz) from public, anon, authenticated;
grant execute on function public.save_catchup_scope(text, timestamptz) to service_role;
