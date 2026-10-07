import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Learning = {
  id: string;
  learned_on: string;
  title: string;
  body: string | null;
  tags: string[];
  is_private: boolean;
};

export type SleepLog = {
  sleep_date: string;
  bed_at: string;
  wake_at: string;
  duration_min: number;
  quality: number | null;
  is_private: boolean;
};

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  start_on: string;
  end_on: string;
  is_private: boolean;
  checks: { checked_on: string; done: boolean }[];
};

export type Metric = {
  id: string;
  name: string;
  unit: string | null;
  is_private: boolean;
  logs: { logged_on: string; value: number }[];
};

export function todayJst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// includePrivate が false のときは、親（habit / metric）が非公開ならその記録ごと出さない
export async function loadDashboard(includePrivate: boolean) {
  await connection();
  const db = createAdminClient();
  const today = todayJst();
  const since = addDays(today, -13);

  const privacy = includePrivate ? [true, false] : [false];

  const [learnings, sleep, habits, metrics] = await Promise.all([
    db.from("learnings").select("id, learned_on, title, body, tags, is_private")
      .in("is_private", privacy)
      .order("learned_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("sleep_logs").select("sleep_date, bed_at, wake_at, duration_min, quality, is_private")
      .in("is_private", privacy)
      .gte("sleep_date", since)
      .order("sleep_date", { ascending: true }),
    db.from("habits").select("id, name, description, start_on, end_on, is_private, checks:habit_checks(checked_on, done)")
      .in("is_private", privacy)
      .lte("start_on", today)
      .gte("end_on", today)
      .order("start_on", { ascending: true }),
    db.from("metrics").select("id, name, unit, is_private, metric_logs(logged_on, value)")
      .in("is_private", privacy)
      .gte("metric_logs.logged_on", since)
      .order("name", { ascending: true }),
  ]);

  for (const r of [learnings, sleep, habits, metrics]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    today,
    since,
    learnings: (learnings.data ?? []) as Learning[],
    sleep: (sleep.data ?? []) as SleepLog[],
    habits: (habits.data ?? []) as Habit[],
    // 埋め込みの絞り込みはテーブル名で書く必要があるので、別名を付けずに取ってから詰め替える
    metrics: (metrics.data ?? []).map(({ metric_logs, ...m }) => ({ ...m, logs: metric_logs })) as Metric[],
  };
}
