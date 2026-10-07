import { Suspense } from "react";
import { DayPage, Loading } from "../../_components/day-page";

export default function DayRoute({ params }: { params: Promise<{ date: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col 2xl:max-w-[1600px] min-[2200px]:max-w-[2000px] gap-4 px-4 py-6">
      <Suspense fallback={<Loading />}>
        <Day params={params} />
      </Suspense>
    </main>
  );
}

async function Day({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <DayPage day={date} />;
}
