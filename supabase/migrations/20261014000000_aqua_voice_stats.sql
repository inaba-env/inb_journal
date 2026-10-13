-- Aqua Voice（音声入力）の利用状況。~/.secretary/bin/journal-sync.py が毎時、Aqua Voice の users/stats/ を呼んで入れる
-- Aqua Voice が返すのは累計（time_saved_hours など）と当日分（words_today など）なので、
-- 1日1行でその日の最後に取れた値を残し、その日に短縮した時間は前の日の行との差で出す

create table public.aqua_voice_stats (
  id uuid primary key default gen_random_uuid(),
  day date not null unique references public.days (day),
  fetched_at timestamptz not null,
  time_saved_hours numeric not null,
  time_saved_min integer,
  words_today integer not null,
  characters_today integer not null,
  total_words integer not null,
  total_characters integer not null,
  average_cpm numeric,
  sessions_count integer,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.aqua_voice_stats is 'Aqua Voice の利用状況。1日1行、その日の最後に取れた値で上書きする';
comment on column public.aqua_voice_stats.fetched_at is 'Aqua Voice から値を取った時刻';
comment on column public.aqua_voice_stats.time_saved_hours is 'Aqua Voice が出す短縮時間の累計（時間）';
comment on column public.aqua_voice_stats.time_saved_min is 'その日に短縮した時間（分）。前の日の行の累計との差。差がマイナスなら空';
comment on column public.aqua_voice_stats.average_cpm is '平均の話す速さ（字/分）';

alter table public.aqua_voice_stats enable row level security;
revoke all on public.aqua_voice_stats from anon, authenticated, service_role;
grant select on public.aqua_voice_stats to service_role;
create trigger set_updated_at before update on public.aqua_voice_stats
  for each row execute function public.set_updated_at();

-- その日の行を置き換える。p_rows は1行だけの配列（他の replace_* 関数と形をそろえる）
create function public.replace_aqua_voice_stats(p_day date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  prev numeric;
begin
  insert into public.days (day) values (p_day) on conflict do nothing;
  select s.time_saved_hours into prev
  from public.aqua_voice_stats s where s.day < p_day order by s.day desc limit 1;
  delete from public.aqua_voice_stats where day = p_day;
  insert into public.aqua_voice_stats (day, fetched_at, time_saved_hours, time_saved_min,
    words_today, characters_today, total_words, total_characters, average_cpm, sessions_count)
  select p_day, r.fetched_at, r.time_saved_hours,
    case when r.time_saved_hours >= coalesce(prev, 0)
      then round((r.time_saved_hours - coalesce(prev, 0)) * 60) end,
    r.words_today, r.characters_today, r.total_words, r.total_characters, r.average_cpm, r.sessions_count
  from jsonb_to_recordset(p_rows)
    as r(fetched_at timestamptz, time_saved_hours numeric, words_today integer, characters_today integer,
         total_words integer, total_characters integer, average_cpm numeric, sessions_count integer);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.replace_aqua_voice_stats(date, jsonb) from public, anon, authenticated;
grant execute on function public.replace_aqua_voice_stats(date, jsonb) to service_role;
