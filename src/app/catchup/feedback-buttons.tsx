"use client";

import { useState, useTransition } from "react";
import { setFeedback } from "./actions";

type Value = "useful" | "skip" | null;

// 押したらすぐ見た目を変え、失敗したら元に戻す。同じボタンをもう一度押すと取り消す
export function FeedbackButtons({ itemId, initial }: { itemId: string; initial: Value }) {
  const [value, setValue] = useState<Value>(initial);
  const [pending, startTransition] = useTransition();

  const press = (next: Exclude<Value, null>) => {
    const prev = value;
    const target = value === next ? null : next;
    setValue(target);
    startTransition(async () => {
      try {
        await setFeedback(itemId, target);
      } catch {
        setValue(prev);
      }
    });
  };

  const base = "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition active:scale-[0.96] disabled:opacity-60";
  const on = "border-accent bg-accent-soft text-accent";
  const off = "border-line text-muted hover:bg-surface-2";
  return (
    <div className="flex gap-1.5">
      <button type="button" disabled={pending} onClick={() => press("useful")} className={`${base} ${value === "useful" ? on : off}`}>
        役に立った
      </button>
      <button type="button" disabled={pending} onClick={() => press("skip")} className={`${base} ${value === "skip" ? on : off}`}>
        いらない
      </button>
    </div>
  );
}
