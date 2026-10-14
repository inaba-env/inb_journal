-- 今日の音楽のメモ（notes の音楽）を1日のページに出す。中身は本人だけに見せ、訪問者には件数だけ見せる（今日の感謝と同じ扱い）
update public.note_categories set show_on_page = true, content_private = true where key = 'music';

-- すでに入っているメモも非公開にそろえる（トリガーが update でも is_private = true にする）
update public.notes n set is_private = true
from public.note_kinds k
where k.id = n.kind_id and k.category_key = 'music' and not n.is_private;
