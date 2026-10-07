import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { resolveViewer } from "@/lib/access";
import { loadChecklist, loadDay } from "@/lib/data";
import { isValidDate, todayJst } from "@/lib/date";
import { DayMeta, DayView } from "./day-view";

// ホーム（day 省略＝今日）と /days/[date] の共通の中身。日付の見出しはレイアウト側（day-header.tsx）
export async function DayPage({ day: requested }: { day?: string }) {
  await connection();
  const viewer = await resolveViewer(await headers());
  if (viewer.kind === "none") redirect("/login");

  const today = todayJst();
  const day = requested ?? today;
  if (!isValidDate(day) || day > today) notFound();

  const isOwner = viewer.kind === "owner";
  const [data, checklist] = await Promise.all([loadDay(day, isOwner), loadChecklist(day, isOwner)]);

  return (
    <>
      <DayMeta mood={data.mood} isOwner={isOwner} />
      <DayView data={data} checklist={checklist} />
    </>
  );
}

// 読み込み中は、出来上がりと同じ形の枠を薄く出しておく（見出しはレイアウトにあるので中身の分だけ）
export function Loading() {
  const block = "animate-pulse rounded-2xl bg-surface-2";
  return (
    <div className="flex flex-col gap-6" aria-label="読み込み中">
      <div className="grid gap-3 lg:grid-cols-12">
        <div className={`${block} h-44 lg:col-span-5`} />
        <div className={`${block} h-44 lg:col-span-7`} />
      </div>
      <div className={`${block} h-56`} />
    </div>
  );
}
