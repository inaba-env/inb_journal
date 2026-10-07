import type { TimeBlock } from "@/lib/data";
import { formatDuration, formatTime, minutesOfDay } from "@/lib/format";
import { timeColor, workColor } from "./categories";

type Marker = { at: string; label: string };

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

// 0:00〜24:00 の帯に、学習の時間と Claude Code の作業を2段で並べる
export function Timeline({
  day,
  timeLogs,
  workSessions,
  markers,
}: {
  day: string;
  timeLogs: TimeBlock[];
  workSessions: TimeBlock[];
  markers: Marker[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative ml-16 h-4 text-[10px] text-zinc-500 sm:ml-24">
        {HOURS.map((h) => (
          <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(h / 24) * 100}%` }}>
            {h}
          </span>
        ))}
      </div>
      <Lane title="学習" day={day} blocks={timeLogs} color={timeColor} markers={markers} />
      <Lane title="Claude Code" day={day} blocks={workSessions} color={workColor} markers={markers} />
      {markers.length > 0 && (
        <p className="ml-16 text-xs text-zinc-500 sm:ml-24">
          {markers.map((m) => `${m.label} ${formatTime(m.at)}`).join("　")}
        </p>
      )}
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

function Lane({
  title,
  day,
  blocks,
  color,
  markers,
}: {
  title: string;
  day: string;
  blocks: TimeBlock[];
  color: (c: string | null) => string;
  markers: Marker[];
}) {
  const placed = stack(blocks, day);
  const rowCount = Math.max(1, ...placed.map((p) => p.row + 1));

  return (
    <div className="flex items-start gap-2">
      <span className="w-14 shrink-0 pt-1 text-xs text-zinc-500 sm:w-22">{title}</span>
      <div className="relative flex-1 rounded bg-zinc-100 dark:bg-zinc-900" style={{ height: rowCount * ROW_PX + 6 }}>
        {HOURS.slice(1, -1).map((h) => (
          <span key={h} className="absolute inset-y-0 w-px bg-zinc-200 dark:bg-zinc-800" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
        {markers.map((m) => (
          <span
            key={m.label}
            className="absolute inset-y-0 w-0.5 bg-zinc-900 dark:bg-zinc-100"
            style={{ left: `${(minutesOfDay(m.at, day) / 1440) * 100}%` }}
          />
        ))}
        {placed.map(({ b, start, end, row }) => (
          <span
            key={b.id}
            tabIndex={0}
            className={`group absolute rounded-sm opacity-90 outline-none hover:z-10 hover:opacity-100 focus:z-10 focus:opacity-100 ${color(b.category)}`}
            style={{
              left: `${(start / 1440) * 100}%`,
              width: `max(3px, ${((end - start) / 1440) * 100}%)`,
              top: 3 + row * ROW_PX,
              height: ROW_PX - 4,
            }}
          >
            <span
              className={
                "pointer-events-none invisible absolute bottom-full z-20 mb-1.5 w-64 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg group-hover:visible group-focus:visible dark:bg-zinc-100 dark:text-zinc-900 " +
                (start > 1440 * 0.6 ? "right-0" : "left-0")
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
        ))}
      </div>
    </div>
  );
}

// 帯の下に出す一覧（時刻順）
export function BlockList({ blocks, color }: { blocks: TimeBlock[]; color: (c: string | null) => string }) {
  if (blocks.length === 0) return <p className="text-sm text-zinc-500">記録なし</p>;
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {blocks.map((b) => (
        <li key={b.id} className="grid grid-cols-[6.5rem_auto_1fr] items-baseline gap-2">
          <span className="tabular-nums text-zinc-500">
            {formatTime(b.started_at)}–{formatTime(b.ended_at)}
          </span>
          <span className={`size-2.5 translate-y-[-1px] self-center rounded-sm ${color(b.category)}`} />
          <span className="min-w-0">
            <span className="text-zinc-500">{b.category ?? "未分類"}</span>
            {b.label && <span>　{b.label}</span>}
            {b.detail && <span className="text-zinc-500">（{b.detail}）</span>}
            <span className="ml-2 text-xs text-zinc-400">{formatDuration(b.duration_min)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
