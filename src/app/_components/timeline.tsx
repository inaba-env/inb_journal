import type { GithubActivity, TimeBlock } from "@/lib/data";
import { formatDuration, formatTime, minutesOfDay } from "@/lib/format";
import { timeColor, workColor } from "./categories";
import { GITHUB_KIND } from "./github";

type Marker = { at: string; label: string };

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

// 0:00〜24:00 の帯に、学習・運動・Claude Code・GitHub を段に分けて並べる。
// 背景・時刻の縦線・起床などの線は全段で1枚につなげ、段の境目に線は引かない。
// 日付をまたいで寝たときは、就寝の線を右端（24:00）に引く
export function Timeline({
  day,
  timeLogs,
  activities,
  workSessions,
  github,
  markers,
}: {
  day: string;
  timeLogs: TimeBlock[];
  activities: TimeBlock[];
  workSessions: TimeBlock[];
  github: GithubActivity[];
  markers: Marker[];
}) {
  const lanes = [
    { title: "学習", placed: stack(timeLogs, day), color: timeColor },
    { title: "運動", placed: stack(activities, day), color: () => "bg-emerald-500" },
    { title: "Claude Code", placed: stack(workSessions, day), color: workColor },
  ].map((lane) => ({ ...lane, height: Math.max(1, ...lane.placed.map((p) => p.row + 1)) * ROW_PX + 8 }));
  const githubHeight = ROW_PX + 8;

  // スマホでは幅が足りないので、帯を広く描いて横スクロールにする（段の名前は左に固定）
  return (
    <div className="-mr-4 overflow-x-auto pr-4 sm:mr-0 sm:overflow-visible sm:pr-0">
      <div className="flex min-w-[720px] flex-col gap-1.5 sm:min-w-0">
        <div className="relative ml-16 h-4 font-mono text-[10px] text-faint sm:ml-24">
          {HOURS.map((h) => (
            <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(h / 24) * 100}%` }}>
              {h}
            </span>
          ))}
        </div>
        <div className="flex">
          <div className="sticky left-0 z-30 flex w-16 shrink-0 flex-col bg-surface sm:static sm:w-24 sm:bg-transparent">
            {lanes.map((lane) => (
              <span key={lane.title} className="pt-1.5 pr-2 text-xs leading-tight font-medium text-muted" style={{ height: lane.height }}>
                {lane.title}
              </span>
            ))}
            <span className="pt-1.5 pr-2 text-xs leading-tight font-medium text-muted" style={{ height: githubHeight }}>
              GitHub
            </span>
          </div>
          <div className="relative flex-1 rounded-xl bg-surface-2/70">
            {HOURS.slice(1, -1).map((h) => (
              <span key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(h / 24) * 100}%` }} />
            ))}
            {markers.map((m) => (
              <span
                key={m.label}
                className="absolute inset-y-0 w-px bg-accent"
                style={{ left: `${(Math.min(minutesOfDay(m.at, day), 1440) / 1440) * 100}%` }}
              />
            ))}
            {lanes.map((lane, i) => (
              <div key={lane.title} className="relative" style={{ height: lane.height }}>
                {lane.placed.map((p) => (
                  <Block key={p.b.id} {...p} color={lane.color} tooltipBelow={i === 0} />
                ))}
              </div>
            ))}
            <div className="relative" style={{ height: githubHeight }}>
              {/* コミットを先に描き、PR・Issue を上に重ねる */}
              {[...github]
                .sort((a, b) => Number(b.kind === "commit") - Number(a.kind === "commit"))
                .map((a) => (
                  <Tick key={a.id} a={a} at={minutesOfDay(a.occurred_at, day)} />
                ))}
            </div>
          </div>
        </div>
        {markers.length > 0 && (
          <ul className="ml-16 flex flex-wrap gap-1.5 pt-1 text-xs sm:ml-24">
            {markers.map((m) => (
              <li key={m.label} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">
                <span className="h-2.5 w-px bg-accent" />
                {m.label}
                <span className="font-mono font-medium tabular-nums">{formatTime(m.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// 重なる作業は段を分ける（空いている最初の段に入れる）
function stack(blocks: TimeBlock[], day: string) {
  const rows: number[] = [];
  return [...blocks]
    .map((b) => ({ b, start: Math.max(0, minutesOfDay(b.started_at, day)), end: Math.min(1440, minutesOfDay(b.ended_at, day)) }))
    .filter((x) => x.end > x.start)
    .sort((a, b) => a.start - b.start)
    .map((x) => {
      let row = rows.findIndex((lastEnd) => lastEnd <= x.start);
      if (row === -1) row = rows.push(0) - 1;
      rows[row] = x.end;
      return { ...x, row };
    });
}

const ROW_PX = 22;

// 帯1本。マウスを乗せる（スマホはタップ）と時刻と内容を出す。いちばん上の段は詳細を下に出す
function Block({
  b,
  start,
  end,
  row,
  color,
  tooltipBelow,
}: {
  b: TimeBlock;
  start: number;
  end: number;
  row: number;
  color: (c: string | null) => string;
  tooltipBelow: boolean;
}) {
  return (
    <span
      tabIndex={0}
      className={`group absolute rounded-md opacity-85 outline-none ring-accent/40 focus-visible:ring-2 hover:z-10 hover:opacity-100 focus:z-10 focus:opacity-100 ${color(b.category)}`}
      style={{
        left: `${(start / 1440) * 100}%`,
        width: `max(3px, ${((end - start) / 1440) * 100}%)`,
        top: 4 + row * ROW_PX,
        height: ROW_PX - 4,
      }}
    >
      <span
        className={
          "pointer-events-none absolute z-20 hidden w-64 max-w-[70vw] rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-background shadow-lg group-hover:block group-focus:block " +
          (tooltipBelow ? "top-full mt-1.5 " : "bottom-full mb-1.5 ") +
          (start > 1440 * 0.65 ? "right-0" : start < 1440 * 0.35 ? "left-0" : "left-1/2 -translate-x-1/2")
        }
      >
        <span className="block tabular-nums opacity-70">
          {formatTime(b.started_at)}–{formatTime(b.ended_at)}（{formatDuration(b.duration_min)}）
        </span>
        {b.category && <span className="block opacity-70">{b.category}</span>}
        {b.label && <span className="block">{b.label}</span>}
        {b.detail && <span className="block opacity-70">{b.detail}</span>}
      </span>
    </span>
  );
}

// GitHub の出来事1件。時刻の位置に細い縦線を引き、マウスを乗せると内容を出す
function Tick({ a, at }: { a: GithubActivity; at: number }) {
  const kind = GITHUB_KIND[a.kind];
  return (
    <span
      tabIndex={0}
      className={`group absolute w-0.5 rounded-sm opacity-80 outline-none hover:z-10 hover:opacity-100 focus:z-10 focus:opacity-100 ${kind.color}`}
      style={{ left: `${(at / 1440) * 100}%`, top: 4, height: ROW_PX - 4 }}
    >
      <span
        className={
          "pointer-events-none absolute bottom-full z-20 mb-1.5 hidden w-64 max-w-[70vw] rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-background shadow-lg group-hover:block group-focus:block " +
          (at > 1440 * 0.65 ? "right-0" : at < 1440 * 0.35 ? "left-0" : "left-1/2 -translate-x-1/2")
        }
      >
        <span className="block tabular-nums opacity-70">
          {formatTime(a.occurred_at)}　{kind.label}
          {a.number != null && ` #${a.number}`}
        </span>
        <span className="block opacity-70">{a.repo}</span>
        <span className="block">{a.title}</span>
      </span>
    </span>
  );
}

// 帯の下に出す一覧（時刻順）
export function BlockList({
  blocks,
  color,
  hideCategory = false,
}: {
  blocks: TimeBlock[];
  color: (c: string | null) => string;
  hideCategory?: boolean;
}) {
  if (blocks.length === 0) return <p className="text-sm text-faint">記録なし</p>;
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {blocks.map((b) => (
        <li key={b.id} className={`grid items-baseline gap-2 ${hideCategory ? "grid-cols-[6.5rem_1fr]" : "grid-cols-[6.5rem_auto_1fr]"}`}>
          <span className="font-mono text-xs text-faint tabular-nums">
            {formatTime(b.started_at)}–{formatTime(b.ended_at)}
          </span>
          {!hideCategory && <span className={`size-2 translate-y-[-1px] self-center rounded-full ${color(b.category)}`} />}
          <span className="min-w-0">
            {!hideCategory && <span className="text-muted">{b.category ?? "未分類"}　</span>}
            {b.label && <span>{b.label}</span>}
            {b.detail && <span className="text-muted">（{b.detail}）</span>}
            <span className="ml-2 font-mono text-[11px] text-faint">{formatDuration(b.duration_min)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
