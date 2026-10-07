import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { resolveViewer } from "@/lib/access";
import { addDays, loadDashboard, type Habit, type Learning, type Metric, type SleepLog } from "@/lib/data";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">読み込み中…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

// 閲覧者の判定に Cookie と IP（リクエスト時の情報）を使うので、ここから下はリクエストごとに描画する
async function Dashboard() {
  const viewer = await resolveViewer(await headers());
  if (viewer.kind === "none") redirect("/login");

  const { today, since, learnings, sleep, habits, metrics } = await loadDashboard(viewer.kind === "owner");

  return (
    <>
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">inb_journal</h1>
        <p className="text-sm text-zinc-500">
          {today}
          {viewer.kind === "owner" && " ・本人として閲覧中"}
        </p>
      </header>

      <Section title="習慣">
        <Habits habits={habits} today={today} />
      </Section>
      <Section title="睡眠（直近14日）">
        <Sleep logs={sleep} since={since} today={today} />
      </Section>
      <Section title="記録">
        <Metrics metrics={metrics} />
      </Section>
      <Section title="学び">
        <Learnings learnings={learnings} />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-semibold dark:border-zinc-800">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-zinc-500">まだ記録がありません。</p>;
}

function PrivateMark({ show }: { show: boolean }) {
  return show ? <span className="ml-2 rounded bg-zinc-200 px-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">非公開</span> : null;
}

function Habits({ habits, today }: { habits: Habit[]; today: string }) {
  if (habits.length === 0) return <Empty />;

  return (
    <ul className="flex flex-col gap-5">
      {habits.map((h) => {
        const done = new Set(h.checks.filter((c) => c.done).map((c) => c.checked_on));
        const days: string[] = [];
        for (let d = h.start_on; d <= h.end_on; d = addDays(d, 1)) days.push(d);
        const elapsed = days.filter((d) => d <= today);
        const achieved = elapsed.filter((d) => done.has(d)).length;

        return (
          <li key={h.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {h.name}
                <PrivateMark show={h.is_private} />
              </p>
              <p className="text-sm text-zinc-500">
                {h.start_on} 〜 {h.end_on}　達成 {achieved} / {elapsed.length} 日
              </p>
            </div>
            {h.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{h.description}</p>}
            <div className="flex flex-wrap gap-1">
              {days.map((d) => (
                <span
                  key={d}
                  title={d}
                  className={
                    "size-5 rounded-sm " +
                    (done.has(d)
                      ? "bg-emerald-500"
                      : d <= today
                        ? "bg-zinc-300 dark:bg-zinc-700"
                        : "border border-zinc-200 dark:border-zinc-800") +
                    (d === today ? " ring-2 ring-zinc-900 dark:ring-zinc-100" : "")
                  }
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(min: number) {
  return `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, "0")}分`;
}

function Sleep({ logs, since, today }: { logs: SleepLog[]; since: string; today: string }) {
  if (logs.length === 0) return <Empty />;

  const byDate = new Map(logs.map((l) => [l.sleep_date, l]));
  const days: string[] = [];
  for (let d = since; d <= today; d = addDays(d, 1)) days.push(d);
  const avg = Math.round(logs.reduce((s, l) => s + l.duration_min, 0) / logs.length);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">平均 {formatDuration(avg)}（{logs.length}日分）</p>
      <ul className="flex flex-col gap-1 text-sm">
        {days.map((d) => {
          const l = byDate.get(d);
          return (
            <li key={d} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
              <span className="tabular-nums text-zinc-500">{d.slice(5)}</span>
              <span className="h-3 rounded-sm bg-zinc-100 dark:bg-zinc-900">
                {l && (
                  <span
                    className="block h-3 rounded-sm bg-sky-500"
                    style={{ width: `${Math.min(100, (l.duration_min / 600) * 100)}%` }}
                  />
                )}
              </span>
              <span className="tabular-nums">
                {l ? `${formatTime(l.bed_at)}–${formatTime(l.wake_at)}　${formatDuration(l.duration_min)}` : "—"}
                {l && <PrivateMark show={l.is_private} />}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Metrics({ metrics }: { metrics: Metric[] }) {
  const withLogs = metrics.filter((m) => m.logs.length > 0);
  if (withLogs.length === 0) return <Empty />;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {withLogs.map((m) => {
        const logs = [...m.logs].sort((a, b) => a.logged_on.localeCompare(b.logged_on));
        const latest = logs[logs.length - 1];
        return (
          <li key={m.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              {m.name}
              <PrivateMark show={m.is_private} />
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {latest.value}
              {m.unit && <span className="ml-1 text-sm font-normal text-zinc-500">{m.unit}</span>}
            </p>
            <p className="text-xs text-zinc-500">{latest.logged_on} 時点・直近14日で{logs.length}件</p>
          </li>
        );
      })}
    </ul>
  );
}

function Learnings({ learnings }: { learnings: Learning[] }) {
  if (learnings.length === 0) return <Empty />;

  return (
    <ul className="flex flex-col gap-4">
      {learnings.map((l) => (
        <li key={l.id} className="flex flex-col gap-1">
          <p className="text-xs text-zinc-500">{l.learned_on}</p>
          <p className="font-medium">
            {l.title}
            <PrivateMark show={l.is_private} />
          </p>
          {l.body && <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{l.body}</p>}
          {l.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {l.tags.map((t) => (
                <span key={t} className="rounded bg-zinc-100 px-1.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
