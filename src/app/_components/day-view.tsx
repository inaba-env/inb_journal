import Link from "next/link";
import { Fragment } from "react";
import type { ChecklistItem, DayData, Exercise } from "@/lib/data";
import { addDays } from "@/lib/data";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { timeColor } from "./categories";
import { GithubSection } from "./github";
import { LinksSection } from "./links";
import { NotesSection } from "./notes";
import { BlockList, Timeline } from "./timeline";
import { Bonji } from "./bonji";
import { Card, CardStack, EmptyCard, HiddenNote, Metric, PrivateMark, Section } from "./ui";

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

const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export function DayHeader({
  day,
  today,
  mood,
  isOwner,
}: {
  day: string;
  today: string;
  mood: string | null;
  isOwner: boolean;
}) {
  const d = new Date(`${day}T00:00:00Z`);
  return (
    <header className="rise flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className="font-mono tabular-nums">{d.getUTCFullYear()}</span>
          <span>{WEEKDAY_NAMES[d.getUTCDay()]}</span>
          {day === today && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">今日</span>}
        </p>
        <h1 className="text-4xl leading-none font-bold tracking-tight sm:text-5xl" aria-label={formatDate(day)}>
          <span className="font-mono tabular-nums">{d.getUTCMonth() + 1}</span>
          <span className="mx-0.5 text-[0.6em] text-muted">月</span>
          <span className="font-mono tabular-nums">{d.getUTCDate()}</span>
          <span className="ml-0.5 text-[0.6em] text-muted">日</span>
        </h1>
        {(mood || isOwner) && (
          <p className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted">
            {mood && (
              <span className="rounded-full border border-line bg-surface px-3 py-1">
                <span className="text-faint">気分</span>　{mood}
              </span>
            )}
            {isOwner && <span className="text-xs text-faint">本人として閲覧中（非公開の記録も表示）</span>}
          </p>
        )}
      </div>
      <nav className="flex items-center rounded-full border border-line bg-surface p-1 shadow-card">
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
  const base = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium";
  if (!href) {
    return (
      <span aria-label={label} aria-disabled className={`${base} text-faint/50`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${base} text-ink transition hover:bg-surface-2 active:scale-[0.96]`}
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

export function DayView({ data, checklist }: { data: DayData; checklist: ChecklistItem[] }) {
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
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 lg:grid-cols-12">
        {checklist.length > 0 && (
          <div className="rise flex lg:col-span-5" style={{ "--i": 1 } as React.CSSProperties}>
            <Bonji items={checklist} className="flex-1" />
          </div>
        )}
        <div
          className={`rise grid grid-cols-2 gap-3 ${checklist.length > 0 ? "lg:col-span-7" : "lg:col-span-12 lg:grid-cols-4"}`}
          style={{ "--i": 2 } as React.CSSProperties}
        >
          <Metric
            label="睡眠"
            className="col-span-2"
            items={[
              { label: "起床", value: data.sleep?.wake_at ? formatTime(data.sleep.wake_at) : null },
              { label: "就寝", value: data.bedTonight ? formatTime(data.bedTonight) : null },
              {
                label: "睡眠時間",
                value: data.sleep?.duration_min != null ? formatDuration(data.sleep.duration_min) : null,
              },
            ]}
            sub={data.sleep?.bed_at ? `前夜 ${formatTime(data.sleep.bed_at)} に就寝` : undefined}
          />
          <Metric
            label="オフィス"
            items={[
              { label: "出社", value: data.office?.arrived_at ? formatTime(data.office.arrived_at) : null },
              { label: "退社", value: data.office?.left_at ? formatTime(data.office.left_at) : null },
            ]}
            sub={data.office?.stay_min != null ? `滞在 ${formatDuration(data.office.stay_min)}` : (data.office?.note ?? undefined)}
          />
          <Metric
            label="学習"
            items={[{ label: "合計", value: studyMin ? formatDuration(studyMin) : null }]}
            sub={data.timeLogs.length ? `${data.timeLogs.length}件の記録` : undefined}
          />
        </div>
      </div>

      <div className="rise" style={{ "--i": 3 } as React.CSSProperties}>
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
      </div>

      <div
        className="rise grid items-start gap-x-5 gap-y-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] 2xl:grid-cols-3"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <div className="flex flex-col gap-8">
          <Section title="学習の時間" aside={studyMin ? formatDuration(studyMin) : undefined}>
            {data.timeLogs.length === 0 ? (
              <EmptyCard />
            ) : (
              <CardStack>
                {groupBy(data.timeLogs, (t) => t.category ?? "未分類").map(([category, blocks]) => (
                  <Card
                    key={category}
                    title={category}
                    icon={<span className={`size-2.5 rounded-full ${timeColor(category)}`} />}
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
              <EmptyCard />
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
                      <ul className="-mt-1 flex flex-col gap-1 text-sm text-ink/80">
                        {w.exercises.map((e, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-faint" />
                            {formatExercise(e)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {activityStats(w) && <p className="-mt-1 font-mono text-xs text-muted tabular-nums">{activityStats(w)}</p>}
                    {w.note && <p className="-mt-1 text-sm leading-relaxed text-muted">{w.note}</p>}
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
        <div className="flex flex-col gap-8 lg:row-span-2">
          {learning && <NotesSection category={learning} notes={data.notes} counts={data.noteCounts} />}
        </div>
        <div className="flex flex-col gap-8 lg:col-start-1 2xl:col-start-3 2xl:row-start-1">
          {/* リンクは振り返りの直下に出す */}
          {others.map((c) => (
            <Fragment key={c.key}>
              <NotesSection category={c} notes={data.notes} counts={data.noteCounts} />
              {c.key === "reflection" && <LinksSection links={data.links} count={data.linkCount} />}
            </Fragment>
          ))}
          {!others.some((c) => c.key === "reflection") && <LinksSection links={data.links} count={data.linkCount} />}
        </div>
      </div>
    </div>
  );
}
