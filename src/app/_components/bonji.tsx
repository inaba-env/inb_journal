import type { ChecklistItem } from "@/lib/data";
import { Card } from "./ui";

// いちばん上に出す凡事徹底。その日の進み具合のバーと、チェックリスト
export function Bonji({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.done).length;
  return (
    <Card
      title="凡事徹底"
      aside={
        <span className="tabular-nums">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{done}</span> / {items.length}
        </span>
      }
    >
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <span
              className={
                "flex size-5 shrink-0 items-center justify-center rounded border " +
                (i.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 dark:border-zinc-700")
              }
              aria-label={i.done ? "できた" : "まだ"}
            >
              {i.done && (
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              )}
            </span>
            <span className={i.done ? "" : "text-zinc-700 dark:text-zinc-300"}>{i.name}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
