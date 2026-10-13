import { Suspense } from "react";
import { DayPage, Loading } from "../../../_components/day-page";

export default function DayRoute({ params }: { params: Promise<{ date: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Day params={params} />
    </Suspense>
  );
}

async function Day({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <DayPage day={date} />;
}
