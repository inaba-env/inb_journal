import Link from "next/link";
import type { DayData, Exercise } from "@/lib/data";
import { addDays } from "@/lib/data";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { timeColor } from "./categories";
import { GithubSection } from "./github";
import { NotesSection } from "./notes";
import { BlockList, Timeline } from "./timeline";
import { Card, CardStack, Empty, HiddenNote, PairStat, PrivateMark, Section, Stat } from "./ui";

// 最初に出てきた順でまとめる
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}
const ACTIVITY_LABEL: Record<string, string> = {
  run: "ラン",
  walk: "ウォーク",
  strength: "筋トレ",
  stretch: "ストレッチ",
  other: "運動",
};

// 腕立て 10回×3セット / チューブ 3セット / ベンチプレス 40kg 8回×3セット
function formatExercise(e: Exercise): string {
  const load = [e.weight_kg != null && `${e.weight_kg}kg`, e.reps != null && `${e.reps}回`].filter(Boolean).join(" ");
  const sets = e.sets != null ? `${e.sets}セット` : "";
  const amount = load && sets ? `${load}×${sets}` : load || sets;
  return [e.exercise, amount, e.note && `（${e.note}）`].filter(Boolean).join(" ");
}

// 訪問者には種目の中身を見せず、数だけ出す
function exerciseCount(n: number): string | null {
  return n > 0 ? `${n}種目` : null;
}

// 6:37/km・130bpm・652kcal（ペースは開始・終了時刻と距離から出す）
function activityStats(a: DayData["activities"][number]): string {
  const sec = a.started_at && a.ended_at ? (Date.parse(a.ended_at) - Date.parse(a.started_at)) / 1000 : null;
  const pace = sec && a.distance_km ? Math.floor(sec / a.distance_km) : null;
  return [
    pace != null && `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km`,
    a.avg_heart_rate != null && `${a.avg_heart_rate}bpm`,
    a.calories != null && `${a.calories}kcal`,
  ]
    .filter(Boolean)
    .join("・");
}

export function DayHeader({ day, today, mood }: { day: string; today: string; mood: string | null }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{formatDate(day)}</h1>
        {mood && <p className="text-sm text-zinc-500">気分：{mood}</p>}
      </div>
      <nav className="flex items-center gap-1.5">
        <NavButton href={`/days/${addDays(day, -1)}`} label="前の日">
          <Chevron direction="left" />
        </NavButton>
        <NavButton href={day !== today ? "/" : undefined} label="今日">
          今日
        </NavButton>
        <NavButton href={day < today ? `/days/${addDays(day, 1)}` : undefined} label="次の日">
          <Chevron direction="right" />
        </NavButton>
      </nav>
    </header>
  );
}

// 使えないときも消さずに薄く出し、ボタンの位置が日によって変わらないようにする
function NavButton({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  const base = "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm";
  if (!href) {
    return (
      <span aria-label={label} aria-disabled className={`${base} border-zinc-100 text-zinc-300 dark:border-zinc-900 dark:text-zinc-700`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${base} border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900`}
    >
      {children}
    </Link>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

export function DayView({ data }: { data: DayData }) {
  // 学びは2列目、それ以外の大分類（振り返り・感謝 など）は3列目に並べる
  const learning = data.noteCategories.find((c) => c.key === "learning");
  const others = data.noteCategories.filter((c) => c.key !== "learning");
  const studyMin = data.timeLogs.reduce((s, t) => s + t.duration_min, 0);
  const markers = [
    ...(data.sleep?.wake_at ? [{ at: data.sleep.wake_at, label: "起床" }] : []),
    ...(data.office?.arrived_at ? [{ at: data.office.arrived_at, label: "オフィス着" }] : []),
    ...(data.office?.left_at ? [{ at: data.office.left_at, label: "オフィス発" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <PairStat
          label="睡眠"
          items={[
            {
              label: "起床",
              value: data.sleep?.wake_at ? formatTime(data.sleep.wake_at) : "—",
            },
            {
              label: "就寝",
              value: data.bedTonight ? formatTime(data.bedTonight) : "—",
            },
            {
              label: "睡眠時間",
              value: data.sleep?.duration_min != null ? formatDuration(data.sleep.duration_min) : "—",
            },
          ]}
          sub={data.sleep?.bed_at ? `前夜 ${formatTime(data.sleep.bed_at)} に就寝` : undefined}
        />
        <PairStat
          label="オフィス"
          items={[
            {
              label: "出社",
              value: data.office?.arrived_at ? formatTime(data.office.arrived_at) : "—",
            },
            {
              label: "退社",
              value: data.office?.left_at ? formatTime(data.office.left_at) : "—",
            },
          ]}
          sub={data.office?.stay_min != null ? `滞在 ${formatDuration(data.office.stay_min)}` : (data.office?.note ?? undefined)}
        />
        <Stat
          label="学習"
          value={studyMin ? formatDuration(studyMin) : "—"}
          sub={data.timeLogs.length ? `${data.timeLogs.length}件` : undefined}
        />
      </div>

      <Card title="タイムライン">
        <Timeline
          day={data.day}
          timeLogs={data.timeLogs}
          activities={data.activities.flatMap((w) =>
            w.started_at && w.ended_at
              ? [
                  {
                    id: w.id,
                    started_at: w.started_at,
                    ended_at: w.ended_at,
                    duration_min: Math.round((Date.parse(w.ended_at) - Date.parse(w.started_at)) / 60000),
                    category: ACTIVITY_LABEL[w.type] ?? w.type,
                    label:
                      w.distance_km != null
                        ? `${w.distance_km}km`
                        : w.exercises.map((e) => e.exercise).join("・") || exerciseCount(w.exercise_count),
                    detail: w.note,
                    is_private: w.is_private,
                  },
                ]
              : [],
          )}
          workSessions={data.workSessions}
          github={data.github}
          markers={markers}
        />
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:grid-rows-[auto_1fr] 2xl:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Section title="学習の時間" aside={studyMin ? formatDuration(studyMin) : undefined}>
            {data.timeLogs.length === 0 ? (
              <Card>
                <Empty />
              </Card>
            ) : (
              <CardStack>
                {groupBy(data.timeLogs, (t) => t.category ?? "未分類").map(([category, blocks]) => (
                  <Card
                    key={category}
                    title={category}
                    icon={<span className={`size-2.5 rounded-sm ${timeColor(category)}`} />}
                    aside={formatDuration(blocks.reduce((s, b) => s + b.duration_min, 0))}
                  >
                    <BlockList blocks={blocks} color={timeColor} hideCategory />
                  </Card>
                ))}
              </CardStack>
            )}
          </Section>
          <Section title="運動" count={data.activityCount}>
            {data.activityCount === 0 ? (
              <Card>
                <Empty />
              </Card>
            ) : (
              <CardStack>
                {data.activities.map((w) => (
                  <Card
                    key={w.id}
                    title={
                      <>
                        {ACTIVITY_LABEL[w.type] ?? w.type}
                        <PrivateMark show={w.is_private} />
                      </>
                    }
                    aside={[
                      w.distance_km != null && `${w.distance_km}km`,
                      w.exercises.length === 0 && exerciseCount(w.exercise_count),
                      w.duration_min != null && formatDuration(w.duration_min),
                    ]
                      .filter(Boolean)
                      .join("・")}
                  >
                    {w.exercises.length > 0 && (
                      <ul className="-mt-1 space-y-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        {w.exercises.map((e, i) => (
                          <li key={i}>{formatExercise(e)}</li>
                        ))}
                      </ul>
                    )}
                    {activityStats(w) && <p className="-mt-1 text-sm tabular-nums text-zinc-500">{activityStats(w)}</p>}
                    {w.note && <p className="-mt-1 text-sm text-zinc-700 dark:text-zinc-300">{w.note}</p>}
                  </Card>
                ))}
                {data.activities.length < data.activityCount && (
                  <Card>
                    <HiddenNote total={data.activityCount} shown={data.activities.length} />
                  </Card>
                )}
              </CardStack>
            )}
          </Section>
          <GithubSection activities={data.github} />
        </div>
        <div className="flex flex-col gap-4 lg:row-span-2">
          {learning && <NotesSection category={learning} notes={data.notes} counts={data.noteCounts} />}
        </div>
        <div className="flex flex-col gap-4 lg:col-start-1 2xl:col-start-3 2xl:row-start-1">
          {others.map((c) => (
            <NotesSection key={c.key} category={c} notes={data.notes} counts={data.noteCounts} />
          ))}
        </div>
      </div>
    </div>
  );
}
