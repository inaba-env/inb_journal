import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Learning = {
  id: string;
  day: string;
  title: string;
  insight: string;
  kind: "knowledge" | "insight" | "practice" | "reflection";
  context: string | null;
  next_action: string | null;
  tags: string[];
  is_private: boolean;
};

export type SleepLog = {
  day: string;
  bed_at: string | null;
  wake_at: string;
  duration_min: number | null;
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
  checks: { day: string; done: boolean }[];
};

export type Metric = {
  id: string;
  name: string;
  unit: string | null;
  is_private: boolean;
  logs: { day: string; value: number }[];
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
    db.from("learnings").select("id, day, title, insight, kind, context, next_action, is_private, learning_tags(tags(name))")
      .in("is_private", privacy)
      .order("day", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("sleep_logs").select("day, bed_at, wake_at, duration_min, quality, is_private")
      .in("is_private", privacy)
      .gte("day", since)
      .order("day", { ascending: true }),
    db.from("habits").select("id, name, description, start_on, end_on, is_private, checks:habit_checks(day, done)")
      .in("is_private", privacy)
      .lte("start_on", today)
      .gte("end_on", today)
      .order("start_on", { ascending: true }),
    db.from("metrics").select("id, name, unit, is_private, metric_logs(day, value)")
      .in("is_private", privacy)
      .gte("metric_logs.day", since)
      .order("name", { ascending: true }),
  ]);

  for (const r of [learnings, sleep, habits, metrics]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    today,
    since,
    learnings: (learnings.data ?? []).map(({ learning_tags, ...l }) => ({
      ...l,
      tags: (learning_tags as unknown as { tags: { name: string } | null }[]).flatMap((lt) => (lt.tags ? [lt.tags.name] : [])),
    })) as Learning[],
    sleep: (sleep.data ?? []) as SleepLog[],
    habits: (habits.data ?? []) as Habit[],
    // 埋め込みの絞り込みはテーブル名で書く必要があるので、別名を付けずに取ってから詰め替える
    metrics: (metrics.data ?? []).map(({ metric_logs, ...m }) => ({ ...m, logs: metric_logs })) as Metric[],
  };
}
