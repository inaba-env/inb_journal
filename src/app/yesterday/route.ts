import { connection, NextResponse, type NextRequest } from "next/server";
import { addDays, todayJst } from "@/lib/date";

// チームに共有する固定リンク。開いた時点の日本時間で「昨日」の日のページへ送る。
export async function GET(request: NextRequest) {
  await connection();
  const yesterday = addDays(todayJst(), -1);
  return NextResponse.redirect(new URL(`/days/${yesterday}`, request.url));
}
