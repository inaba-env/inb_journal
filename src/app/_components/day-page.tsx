import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { resolveViewer } from "@/lib/access";
import { isValidDate, loadChecklist, loadDay, todayJst } from "@/lib/data";
import { DayHeader, DayView } from "./day-view";
import { BonjiProgress } from "./bonji";

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
      <DayHeader day={day} today={today} mood={data.mood} />
      <BonjiProgress items={checklist} />
      <DayView data={data} checklist={checklist} />
      {isOwner && <p className="text-right text-xs text-zinc-400">本人として閲覧中（非公開の記録も表示）</p>}
    </>
  );
}

export function Loading() {
  return <p className="text-sm text-zinc-500">読み込み中…</p>;
}
