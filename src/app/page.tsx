import { Suspense } from "react";
import { DayPage, Loading } from "./_components/day-page";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col 2xl:max-w-[1600px] min-[2200px]:max-w-[2000px] gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Suspense fallback={<Loading />}>
        <DayPage />
      </Suspense>
    </main>
  );
}
