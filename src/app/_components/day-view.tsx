import Link from "next/link";
import type { Commitment, DayData, LearningKind, ReflectionKind } from "@/lib/data";
import { addDays } from "@/lib/data";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { timeColor } from "./categories";
import { BlockList, Timeline } from "./timeline";
import { Card, CardStack, Empty, HiddenNote, PairStat, PrivateMark, Section, Stat, SubHeading } from "./ui";

// 感謝は「今日の感謝」の欄に出すので、振り返りのカードには出さない
const REFLECTION_LABEL: Record<Exclude<ReflectionKind, "gratitude">, string> = {
  highlight: "ハイライト",
  went_well: "できたこと",
  went_badly: "うまくいかなかったこと",
  carried_over: "繰り越したタスク",
  lesson: "教訓",
  thought: "考えたこと",
  quiet_good: "静かな良いこと",
  catch_up: "キャッチアップ",
  music: "今日の音楽",
};

const KIND_LABEL: Record<LearningKind, string> = {
  knowledge: "知識",
  insight: "気づき",
  practice: "やり方",
};

// 最初に出てきた順でまとめる
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}
const WORKOUT_LABEL: Record<string, string> = {
  run: "ラン",
  walk: "ウォーク",
  strength: "筋トレ",
  stretch: "ストレッチ",
  other: "運動",
};
const RESULT: Record<string, { label: string; className: string }> = {
  done: {
    label: "できた",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  partial: {
    label: "半分",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  not_done: {
    label: "できなかった",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
};

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
  const gratitude = data.reflections.filter((r) => r.kind === "gratitude");
  const reflections = data.reflections.filter((r) => r.kind !== "gratitude");
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
            {
              label: "起床",
              value: data.sleep ? formatTime(data.sleep.wake_at) : "—",
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
          workouts={data.workouts.flatMap((w) =>
            w.started_at && w.ended_at
              ? [
                  {
                    id: w.id,
                    started_at: w.started_at,
                    ended_at: w.ended_at,
                    duration_min: Math.round((Date.parse(w.ended_at) - Date.parse(w.started_at)) / 60000),
                    category: WORKOUT_LABEL[w.type] ?? w.type,
                    label: w.distance_km != null ? `${w.distance_km}km` : null,
                    detail: w.note,
                    is_private: w.is_private,
                  },
                ]
              : [],
          )}
          workSessions={data.workSessions}
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
          <Section title="運動" count={data.workouts.length}>
            {data.workouts.length === 0 ? (
              <Card>
                <Empty />
              </Card>
            ) : (
              <CardStack>
                {data.workouts.map((w) => (
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
                ))}
              </CardStack>
            )}
          </Section>
        </div>
        <div className="flex flex-col gap-4 lg:row-span-2">
          <Section title="学び" count={Object.values(data.learningCounts).reduce((a, b) => a + b, 0)}>
            {(Object.keys(KIND_LABEL) as LearningKind[]).map((kind) => {
              const items = data.learnings.filter((l) => l.kind === kind);
              return (
                <div key={kind} className="flex flex-col gap-2">
                  <SubHeading title={KIND_LABEL[kind]} count={data.learningCounts[kind]} />
                  {items.length === 0 ? (
                    <Card>{data.learningCounts[kind] > 0 ? <HiddenNote total={data.learningCounts[kind]} shown={0} /> : <Empty />}</Card>
                  ) : (
                    <CardStack>
                      {items.map((l) => (
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
                                  <span
                                    key={t}
                                    className="rounded bg-zinc-100 px-1.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
                      <HiddenNote total={data.learningCounts[kind]} shown={items.length} />
                    </CardStack>
                  )}
                </div>
              );
            })}
          </Section>
        </div>
        <div className="flex flex-col gap-4 lg:col-start-1 2xl:col-start-3 2xl:row-start-1">
          <Section title="今日の感謝" count={data.gratitudeCount}>
            <Card>
              {data.gratitudeCount === 0 && <Empty />}
              {gratitude.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm">
                  {gratitude.map((g) => (
                    <li key={g.id}>
                      ・{g.content}
                      <PrivateMark show={g.is_private} />
                    </li>
                  ))}
                </ul>
              )}
              <HiddenNote total={data.gratitudeCount} shown={gratitude.length} />
            </Card>
          </Section>
          {(data.commitmentsReviewed.length > 0 || data.reflectionCount > 0 || data.commitmentsMade.length > 0) && (
            <Section title="振り返りと約束">
              <CardStack>
                {data.commitmentsReviewed.length > 0 && (
                  <Card title="昨日の約束の振り返り" count={data.commitmentsReviewed.length}>
                    <Commitments items={data.commitmentsReviewed} showResult />
                  </Card>
                )}
                {data.reflectionCount > 0 && (
                  <Card title="振り返り" count={data.reflectionCount}>
                    <dl className="flex flex-col gap-3">
                      {(Object.keys(REFLECTION_LABEL) as (keyof typeof REFLECTION_LABEL)[])
                        .map((kind) => [kind, reflections.filter((r) => r.kind === kind)] as const)
                        .filter(([, items]) => items.length > 0)
                        .map(([kind, items]) => (
                          <div key={kind}>
                            <dt className="text-xs text-zinc-500">{REFLECTION_LABEL[kind]}</dt>
                            {items.map((r) => (
                              <dd key={r.id} className="text-sm">
                                ・{r.content}
                                {r.reason && <span className="text-zinc-500">（{r.reason}）</span>}
                                {r.media && <span className="text-zinc-500">（{r.media}）</span>}
                                <PrivateMark show={r.is_private} />
                              </dd>
                            ))}
                          </div>
                        ))}
                    </dl>
                    <HiddenNote total={data.reflectionCount} shown={reflections.length} />
                  </Card>
                )}
                {data.commitmentsMade.length > 0 && (
                  <Card title="明日に向けて" count={data.commitmentsMade.length}>
                    <Commitments items={data.commitmentsMade} />
                  </Card>
                )}
              </CardStack>
            </Section>
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
