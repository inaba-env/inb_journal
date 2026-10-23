"use client";

import { useState, useTransition } from "react";
import type { CatchupFeedback } from "@/lib/catchup";
import { setFeedback } from "./actions";

const OPTIONS: { value: CatchupFeedback; label: string }[] = [
  { value: "interested", label: "関心あり" },
  { value: "should_know", label: "知っておくべき" },
  { value: "out_of_scope", label: "範囲外" },
];

// 押したらすぐ見た目を変え、失敗したら元に戻す。同じボタンをもう一度押すと取り消す。
// 一言メモは「メモ」を押すと出し、入力欄から離れたとき（か Enter）に保存する
export function Feedback({
  itemId,
  initial,
  initialNote,
}: {
  itemId: string;
  initial: CatchupFeedback | null;
  initialNote: string | null;
}) {
  const [value, setValue] = useState(initial);
  const [note, setNote] = useState(initialNote ?? "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(initialNote));
  const [pending, startTransition] = useTransition();

  const save = (nextValue: CatchupFeedback | null, nextNote: string) => {
    const prev = { value, savedNote };
    setValue(nextValue);
    startTransition(async () => {
      try {
        await setFeedback(itemId, nextValue, nextNote);
        setSavedNote(nextNote);
      } catch {
        setValue(prev.value);
        setNote(prev.savedNote);
      }
    });
  };

  const base = "rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-[0.96] disabled:opacity-60";
  const on = "border-accent bg-accent-soft text-accent";
  const off = "border-line text-muted hover:bg-surface-2";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => save(value === o.value ? null : o.value, savedNote)}
            className={`${base} ${value === o.value ? on : off}`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setNoteOpen(!noteOpen)}
          className={`${base} ${savedNote ? on : off}`}
          aria-expanded={noteOpen}
        >
          メモ
        </button>
      </div>
      {noteOpen && (
        <input
          type="text"
          value={note}
          maxLength={500}
          placeholder="例：PHP まわりは全部欲しい／ローカル LLM は要らない"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note.trim() !== savedNote && save(value, note.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      )}
    </div>
  );
}
