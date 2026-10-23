import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CatchupSection = "vuln" | "ai_tools" | "discussion" | "interest";
export type CatchupFeedback = "interested" | "should_know" | "out_of_scope";

export type CatchupItem = {
  id: string;
  section: CatchupSection;
  featured: boolean;
  title: string;
  summary: string;
  pro: string | null;
  con: string | null;
  voices: string | null;
  action: string | null;
  severity: string | null;
  url: string | null;
  thread_url: string | null;
  source: string | null;
  feedback: CatchupFeedback | null;
  feedback_note: string | null;
};

export type CatchupReport = {
  id: string;
  kind: "weekly" | "alert";
  period_start: string;
  period_end: string;
  headline: string | null;
  is_private: boolean;
  items: CatchupItem[];
};

export type CatchupPage = {
  // 表示中の週次レポート（無ければ null）
  weekly: CatchupReport | null;
  // 直近2週間の緊急の脆弱性
  alerts: CatchupReport[];
  // 過去の週次レポート（新しい順）。選ぶためのリンクに使う
  weeklyList: { id: string; period_start: string; period_end: string }[];
  // 反応からまとめた関心の範囲（Markdown）。本人にだけ返す
  scope: { body: string; updated_at: string } | null;
};

const ITEM_COLUMNS =
  "id, section, featured, title, summary, pro, con, voices, action, severity, url, thread_url, source, feedback, feedback_note";
const REPORT_COLUMNS = `id, kind, period_start, period_end, headline, is_private, catchup_items(${ITEM_COLUMNS}, sort_order)`;

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

type ReportRow = Omit<CatchupReport, "items"> & { catchup_items: (CatchupItem & { sort_order: number })[] };

function toReport(r: ReportRow): CatchupReport {
  const { catchup_items, ...rest } = r;
  return { ...rest, items: [...catchup_items].sort((a, b) => a.sort_order - b.sort_order) };
}

// includePrivate が false のときは is_private = false のレポートだけを返す。reportId を省くと最新の週次
export async function loadCatchup(reportId: string | undefined, includePrivate: boolean, today: string): Promise<CatchupPage> {
  await connection();
  const db = createAdminClient();
  const privacy = includePrivate ? [true, false] : [false];
  const twoWeeksAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 14 * 86400000).toISOString().slice(0, 10);

  const [list, alerts, scope] = await Promise.all([
    db
      .from("catchup_reports")
      .select("id, period_start, period_end")
      .eq("kind", "weekly")
      .in("is_private", privacy)
      .order("period_start", { ascending: false })
      .limit(52),
    db
      .from("catchup_reports")
      .select(REPORT_COLUMNS)
      .eq("kind", "alert")
      .in("is_private", privacy)
      .gte("period_start", twoWeeksAgo)
      .order("period_start", { ascending: false }),
    includePrivate ? db.from("catchup_scope").select("body, updated_at").maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const weeklyList = check(list);

  const targetId = reportId ?? weeklyList[0]?.id;
  let weekly: CatchupReport | null = null;
  if (targetId && weeklyList.some((w) => w.id === targetId)) {
    const row = check(await db.from("catchup_reports").select(REPORT_COLUMNS).eq("id", targetId).single());
    weekly = toReport(row as unknown as ReportRow);
  }

  return {
    weekly,
    alerts: (check(alerts) as unknown as ReportRow[]).map(toReport),
    weeklyList,
    scope: check(scope),
  };
}
