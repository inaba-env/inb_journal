import { connection } from "next/server";
import { Suspense } from "react";
import { DayHeader, DayHeaderSkeleton } from "../_components/day-header";

// 日のページ（/ と /days/[date]）の共通の枠。見出しはここに置き、日を移っても作り直さない（読み込み直すのは中身だけ）
export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col 2xl:max-w-[1600px] min-[2200px]:max-w-[2000px] gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Suspense fallback={<DayHeaderSkeleton />}>
        <Header />
      </Suspense>
      {children}
    </main>
  );
}

// 見出しは今日の日付と URL で決まるので、先に描かず（プリレンダーしない）リクエストごとに出す
async function Header() {
  await connection();
  return <DayHeader />;
}
