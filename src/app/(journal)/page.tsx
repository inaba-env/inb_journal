import { Suspense } from "react";
import { DayPage, Loading } from "../_components/day-page";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <DayPage />
    </Suspense>
  );
}
