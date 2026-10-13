"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { addDays, isValidDate, todayJst } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { RefreshButton } from "./refresh-button";

const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

// / は今日、/days/YYYY-MM-DD はその日。それ以外は null
function dayFromPath(pathname: string, today: string): string | null {
  if (pathname === "/") return today;
  const m = pathname.match(/^\/days\/([^/]+)$/);
  return m ? m[1] : null;
}

// 日付の見出しと前後の日への移動。レイアウトに置き、日を移っても作り直さずに URL から日付だけ変える
// 日付しか出さない（気分などの記録はページ側に出す）
export function DayHeader() {
  const pathname = usePathname();
  useRiseOnlyOnFirstLoad(pathname);

  const today = todayJst();
  const day = dayFromPath(pathname, today);
  // 不正な日付・未来の日はページ側で notFound になるので、見出しは出さない
  if (!day || !isValidDate(day) || day > today) return null;

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
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <RefreshButton />
      </nav>
    </header>
  );
}

// ふわっと出す動き（.rise）は最初の読み込みのときだけにする。
// 日を移るたびに動くと全部読み込み直したように見えるので、移ったら <html data-navigated> を付けて止める（globals.css）
function useRiseOnlyOnFirstLoad(pathname: string) {
  const first = useRef(pathname);
  useLayoutEffect(() => {
    if (pathname !== first.current) document.documentElement.dataset.navigated = "";
  }, [pathname]);
}

// 見出しが出るまでの枠
export function DayHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-5 w-28 animate-pulse rounded-full bg-surface-2" />
        <div className="h-10 w-48 animate-pulse rounded-full bg-surface-2 sm:h-12" />
      </div>
      <div className="h-11 w-36 animate-pulse rounded-full bg-surface-2" />
    </div>
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
