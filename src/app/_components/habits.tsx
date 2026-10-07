import type { HabitSummary } from "@/lib/data";
import { Card } from "./ui";

export function Habits({ habits, today }: { habits: HabitSummary[]; today: string }) {
  if (habits.length === 0) return null;
  return (
    <Card title="習慣">
      <ul className="flex flex-col gap-4">
        {habits.map((h) => (
          <li key={h.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-medium">{h.name}</p>
              <p className="text-sm text-zinc-500">
                <span className="text-base font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{h.streak}</span> 日連続
                <span className="ml-3 tabular-nums">
                  達成 {h.achieved} / {h.elapsed} 日
                </span>
              </p>
            </div>
            {h.description && <p className="text-xs text-zinc-500">{h.description}（{h.start_on} 〜 {h.end_on}）</p>}
            <div className="flex gap-1">
              {h.recent.map((d) => (
                <span
                  key={d.day}
                  title={d.day}
                  className={
                    "h-5 flex-1 rounded-sm sm:max-w-6 " +
                    (d.done ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800") +
                    (d.day === today ? " ring-2 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 dark:ring-offset-zinc-950" : "")
                  }
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
