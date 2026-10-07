import Link from "next/link";
import type { Commitment, DayData, ReflectionKind } from "@/lib/data";
import { addDays } from "@/lib/data";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { timeColor } from "./categories";
import { BlockList, Timeline } from "./timeline";
import { Card, PrivateMark, Section, Stat } from "./ui";

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

const KIND_LABEL = { knowledge: "知識", insight: "気づき", practice: "やり方", reflection: "振り返り" } as const;
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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat
          label="起床"
          value={data.sleep ? formatTime(data.sleep.wake_at) : "—"}
          sub={
            data.sleep?.bed_at && data.sleep.duration_min !== null
              ? `就寝 ${formatTime(data.sleep.bed_at)}・${formatDuration(data.sleep.duration_min)}`
              : undefined
          }
        />
        <Stat
          label="オフィス"
          value={data.office?.arrived_at ? formatTime(data.office.arrived_at) : "—"}
          sub={data.office?.left_at ? `退社 ${formatTime(data.office.left_at)}` : data.office?.note ?? undefined}
        />
        <Stat
          label="運動"
          value={data.workouts.length ? data.workouts.map((w) => WORKOUT_LABEL[w.type] ?? w.type).join("・") : "—"}
          sub={data.workouts
            .map((w) => [w.distance_km && `${w.distance_km}km`, w.duration_min && formatDuration(w.duration_min)].filter(Boolean).join(" "))
            .filter(Boolean)
            .join("・") || undefined}
        />
        <Stat label="学習" value={studyMin ? formatDuration(studyMin) : "—"} sub={data.timeLogs.length ? `${data.timeLogs.length}件` : undefined} />
      </div>

      <Card title="タイムライン">
        <Timeline day={data.day} timeLogs={data.timeLogs} workSessions={data.workSessions} markers={markers} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card title="学習の時間" aside={studyMin ? formatDuration(studyMin) : undefined}>
            <BlockList blocks={data.timeLogs} color={timeColor} />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {data.commitmentsReviewed.length > 0 && (
            <Card title="昨日の約束の振り返り">
              <Commitments items={data.commitmentsReviewed} showResult />
            </Card>
          )}
          {data.learnings.length > 0 && (
            <Section title="学び" aside={`${data.learnings.length}件`}>
              <ul className="flex flex-col gap-2">
                {data.learnings.map((l) => (
                  <li key={l.id} className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">
                      {KIND_LABEL[l.kind]}
                      {l.media && `・${l.media}`}
                      {l.context && !l.media && `・${l.context}`}
                    </p>
                    <p className="font-medium">
                      {l.title}
                      <PrivateMark show={l.is_private} />
                    </p>
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
                  </li>
                ))}
              </ul>
            </Section>
          )}
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
