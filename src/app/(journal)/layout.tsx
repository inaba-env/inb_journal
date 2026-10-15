import { connection } from "next/server";
import { Suspense } from "react";
import { DayHeader, DayHeaderSkeleton } from "../_components/day-header";

// 日のページ（/ と /days/[date]）の共通の枠。幅は画面に合わせて広げ、左右の余白も画面幅に比例させる。見出しはここに置き、日を移っても作り直さない（読み込み直すのは中身だけ）
export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex w-full flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 lg:px-[4vw]">
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
