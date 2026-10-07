import type { ChecklistItem } from "@/lib/data";

// 全部できたら緑。半分以上なら黄、半分未満なら赤
function ringColor(ratio: number): string {
  if (ratio >= 1) return "text-emerald-500";
  if (ratio >= 0.5) return "text-amber-400";
  return "text-rose-500";
}

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

// いちばん上に出す凡事徹底。その日の進み具合のリングと、チェックリスト
export function Bonji({ items, className = "" }: { items: ChecklistItem[]; className?: string }) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.done).length;
  const ratio = done / items.length;
  return (
    <section
      className={`flex items-center gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:gap-7 ${className}`}
    >
      <div className="relative size-24 shrink-0 sm:size-32" role="img" aria-label={`${items.length}項目中${done}項目できた`}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="9" className="stroke-surface-2" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
            className={`${ringColor(ratio)} transition-[stroke-dashoffset] duration-700`}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl leading-none font-semibold tabular-nums">{done}</span>
          <span className="mt-1 font-mono text-[11px] text-faint tabular-nums">/ {items.length}</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-tight">凡事徹底</h2>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-2.5 text-sm">
              <span
                className={
                  "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border " +
                  (i.done ? "border-accent bg-accent text-surface" : "border-line bg-surface-2")
                }
                aria-label={i.done ? "できた" : "まだ"}
              >
                {i.done && (
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                )}
              </span>
              <span className={i.done ? "text-ink" : "text-muted"}>{i.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
