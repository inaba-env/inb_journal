import Link from "next/link";
import type { Commitment, DayData, LearningKind, ReflectionKind } from "@/lib/data";
import { addDays } from "@/lib/data";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { timeColor } from "./categories";
import { BlockList, Timeline } from "./timeline";
import { Card, PairStat, PrivateMark, Section, Stat } from "./ui";

const REFLECTION_LABEL: Record<ReflectionKind, string> = {
  highlight: "ハイライト",
  went_well: "できたこと",
  went_badly: "うまくいかなかったこと",
  carried_over: "繰り越したタスク",
  thought: "考えたこと",
  gratitude: "感謝",
  quiet_good: "静かな良いこと",
  catch_up: "キャッチアップ",
  music: "今日の音楽",
};

const KIND_LABEL: Record<LearningKind, string> = { knowledge: "知識", insight: "気づき", practice: "やり方", reflection: "振り返り" };

// 最初に出てきた順でまとめる
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}
const WORKOUT_LABEL: Record<string, string> = { run: "ラン", walk: "ウォーク", strength: "筋トレ", stretch: "ストレッチ", other: "運動" };
const RESULT: Record<string, { label: string; className: string }> = {
  done: { label: "できた", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  partial: { label: "半分", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  not_done: { label: "できなかった", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
};

export function DayHeader({ day, today, mood }: { day: string; today: string; mood: string | null }) {
  const nav = "rounded-md border border-zinc-200 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900";
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{formatDate(day)}</h1>
        {mood && <p className="text-sm text-zinc-500">気分：{mood}</p>}
      </div>
      <nav className="flex gap-1.5">
        <Link className={nav} href={`/days/${addDays(day, -1)}`} aria-label="前の日">
          ←
        </Link>
        {day !== today && (
          <Link className={nav} href="/">
            今日
          </Link>
        )}
        {day < today && (
          <Link className={nav} href={`/days/${addDays(day, 1)}`} aria-label="次の日">
            →
          </Link>
        )}
      </nav>
    </header>
  );
}

export function DayView({ data }: { data: DayData }) {
  const studyMin = data.timeLogs.reduce((s, t) => s + t.duration_min, 0);
  const markers = [
    ...(data.sleep ? [{ at: data.sleep.wake_at, label: "起床" }] : []),
    ...(data.office?.arrived_at ? [{ at: data.office.arrived_at, label: "オフィス着" }] : []),
    ...(data.office?.left_at ? [{ at: data.office.left_at, label: "オフィス発" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <PairStat
          label="睡眠"
          items={[
            { label: "起床", value: data.sleep ? formatTime(data.sleep.wake_at) : "—" },
            { label: "就寝", value: data.bedTonight ? formatTime(data.bedTonight) : "—" },
            { label: "睡眠時間", value: data.sleep?.duration_min != null ? formatDuration(data.sleep.duration_min) : "—" },
          ]}
          sub={data.sleep?.bed_at ? `前夜 ${formatTime(data.sleep.bed_at)} に就寝` : undefined}
        />
        <PairStat
          label="オフィス"
          items={[
            { label: "出社", value: data.office?.arrived_at ? formatTime(data.office.arrived_at) : "—" },
            { label: "退社", value: data.office?.left_at ? formatTime(data.office.left_at) : "—" },
          ]}
          sub={data.office?.stay_min != null ? `滞在 ${formatDuration(data.office.stay_min)}` : data.office?.note ?? undefined}
        />
        <Stat label="学習" value={studyMin ? formatDuration(studyMin) : "—"} sub={data.timeLogs.length ? `${data.timeLogs.length}件` : undefined} />
      </div>

      <Card title="タイムライン">
        <Timeline day={data.day} timeLogs={data.timeLogs} workSessions={data.workSessions} markers={markers} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Section title="学習の時間" aside={studyMin ? formatDuration(studyMin) : undefined}>
            {data.timeLogs.length === 0 ? (
              <p className="px-1 text-sm text-zinc-500">記録なし</p>
            ) : (
              groupBy(data.timeLogs, (t) => t.category ?? "未分類").map(([category, blocks]) => (
                <Card
                  key={category}
                  title={category}
                  icon={<span className={`size-2.5 rounded-sm ${timeColor(category)}`} />}
                  aside={formatDuration(blocks.reduce((s, b) => s + b.duration_min, 0))}
                >
                  <BlockList blocks={blocks} color={timeColor} hideCategory />
                </Card>
              ))
            )}
          </Section>
          <Section title="運動">
            {data.workouts.length === 0 ? (
              <p className="px-1 text-sm text-zinc-500">記録なし</p>
            ) : (
              data.workouts.map((w) => (
                <Card
                  key={w.id}
                  title={
                    <>
                      {WORKOUT_LABEL[w.type] ?? w.type}
                      <PrivateMark show={w.is_private} />
                    </>
                  }
                  aside={[w.distance_km != null && `${w.distance_km}km`, w.duration_min != null && formatDuration(w.duration_min)]
                    .filter(Boolean)
                    .join("・")}
                >
                  {w.note && <p className="-mt-1 text-sm text-zinc-700 dark:text-zinc-300">{w.note}</p>}
                </Card>
              ))
            )}
          </Section>
        </div>
        <div className="flex flex-col gap-4">
          {data.commitmentsReviewed.length > 0 && (
            <Card title="昨日の約束の振り返り">
              <Commitments items={data.commitmentsReviewed} showResult />
            </Card>
          )}
          <Section title="学び" aside={`${data.learnings.length}件`}>
            {(Object.keys(KIND_LABEL) as LearningKind[]).map((kind) => {
              const items = data.learnings.filter((l) => l.kind === kind);
              return (
                <div key={kind} className="flex flex-col gap-2">
                  <h3 className="px-1 pt-1 text-xs text-zinc-500">
                    {KIND_LABEL[kind]}
                    {items.length > 0 && `（${items.length}）`}
                  </h3>
                  {items.length === 0 ? (
                    <p className="px-1 text-sm text-zinc-400">なし</p>
                  ) : (
                    items.map((l) => (
                      <Card
                        key={l.id}
                        title={
                          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                            {l.title}
                            <PrivateMark show={l.is_private} />
                          </span>
                        }
                      >
                        <div className="-mt-2 flex flex-col gap-1">
                          {(l.media || l.context) && <p className="text-xs text-zinc-500">{l.media ?? l.context}</p>}
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">{l.insight}</p>
                          {l.next_action && <p className="text-sm text-zinc-500">→ {l.next_action}</p>}
                          {l.tags.length > 0 && (
                            <p className="flex flex-wrap gap-1 pt-1">
                              {l.tags.map((t) => (
                                <span key={t} className="rounded bg-zinc-100 px-1.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                  {t}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              );
            })}
          </Section>
          {data.reflections.length > 0 && (
            <Card title="振り返り">
              <dl className="flex flex-col gap-3">
                {(Object.keys(REFLECTION_LABEL) as ReflectionKind[])
                  .map((kind) => [kind, data.reflections.filter((r) => r.kind === kind)] as const)
                  .filter(([, items]) => items.length > 0)
                  .map(([kind, items]) => (
                    <div key={kind}>
                      <dt className="text-xs text-zinc-500">{REFLECTION_LABEL[kind]}</dt>
                      {items.map((r) => (
                        <dd key={r.id} className="text-sm">
                          ・{r.content}
                          {r.reason && <span className="text-zinc-500">（{r.reason}）</span>}
                          <PrivateMark show={r.is_private} />
                        </dd>
                      ))}
                    </div>
                  ))}
              </dl>
            </Card>
          )}
          {data.commitmentsMade.length > 0 && (
            <Card title="明日に向けて">
              <Commitments items={data.commitmentsMade} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Commitments({ items, showResult = false }: { items: Commitment[]; showResult?: boolean }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((c) => (
        <li key={c.id} className="flex flex-col gap-0.5">
          <p>
            {showResult && c.result && (
              <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${RESULT[c.result].className}`}>{RESULT[c.result].label}</span>
            )}
            {c.content}
            <PrivateMark show={c.is_private} />
          </p>
          {showResult && c.review_note && <p className="text-zinc-500">→ {c.review_note}</p>}
        </li>
      ))}
    </ul>
  );
}
