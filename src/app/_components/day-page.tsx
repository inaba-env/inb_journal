import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { resolveViewer } from "@/lib/access";
import { isValidDate, loadChecklist, loadDay, todayJst } from "@/lib/data";
import { DayHeader, DayView } from "./day-view";

// ホーム（day 省略＝今日）と /days/[date] の共通の中身
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
      <DayHeader day={day} today={today} mood={data.mood} isOwner={isOwner} />
      <DayView data={data} checklist={checklist} />
    </>
  );
}

// 読み込み中は、出来上がりと同じ形の枠を薄く出しておく
export function Loading() {
  const block = "animate-pulse rounded-2xl bg-surface-2";
  return (
    <div className="flex flex-col gap-6" aria-label="読み込み中">
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-4 w-28 animate-pulse rounded-full bg-surface-2" />
        <div className="h-12 w-48 animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <div className={`${block} h-44 lg:col-span-5`} />
        <div className={`${block} h-44 lg:col-span-7`} />
      </div>
      <div className={`${block} h-56`} />
    </div>
  );
}
