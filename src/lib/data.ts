import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LearningKind = "knowledge" | "insight" | "practice" | "reflection";
export type ReflectionKind =
  | "highlight"
  | "thought"
  | "gratitude"
  | "quiet_good"
  | "went_well"
  | "went_badly"
  | "carried_over"
  | "catch_up"
  | "music";

export type TimeBlock = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_min: number;
  category: string | null;
  label: string | null;
  detail: string | null;
  is_private: boolean;
};

export type Learning = {
  id: string;
  title: string;
  insight: string;
  kind: LearningKind;
  context: string | null;
  next_action: string | null;
  media: string | null;
  tags: string[];
  is_private: boolean;
};

export type Reflection = {
  id: string;
  kind: ReflectionKind;
  content: string;
  reason: string | null;
  is_private: boolean;
};

export type Commitment = {
  id: string;
  made_on: string;
  content: string;
  result: "done" | "partial" | "not_done" | null;
  review_note: string | null;
  is_private: boolean;
};

export type DayData = {
  day: string;
  mood: string | null;
  sleep: { bed_at: string | null; wake_at: string; duration_min: number | null; is_private: boolean } | null;
  // その日の夜に寝た時刻（翌日の睡眠の記録の bed_at）
  bedTonight: string | null;
  office: { arrived_at: string | null; left_at: string | null; stay_min: number | null; note: string | null } | null;
  workouts: { id: string; type: string; distance_km: number | null; duration_min: number | null; note: string | null; is_private: boolean }[];
  timeLogs: TimeBlock[];
  workSessions: TimeBlock[];
  reflections: Reflection[];
  learnings: Learning[];
  commitmentsMade: Commitment[];
  commitmentsReviewed: Commitment[];
};

export type HabitSummary = {
  id: string;
  name: string;
  description: string | null;
  start_on: string;
  end_on: string;
  streak: number;
  achieved: number;
  elapsed: number;
  recent: { day: string; done: boolean }[];
};

export function todayJst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && addDays(value, 0) === value;
}

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

// includePrivate が false のときは is_private = false の記録だけを返す
export async function loadDay(day: string, includePrivate: boolean): Promise<DayData> {
  await connection();
  const db = createAdminClient();
  const privacy = includePrivate ? [true, false] : [false];

  const [dayRow, sleep, nextSleep, office, workouts, timeLogs, workSessions, reflections, learnings, made, reviewed] =
    await Promise.all([
      db.from("days").select("mood, is_private").eq("day", day).maybeSingle(),
      db.from("sleep_logs").select("bed_at, wake_at, duration_min, is_private").eq("day", day).in("is_private", privacy).maybeSingle(),
      db.from("sleep_logs").select("bed_at").eq("day", addDays(day, 1)).in("is_private", privacy).maybeSingle(),
      db.from("office_logs").select("arrived_at, left_at, stay_min, note").eq("day", day).in("is_private", privacy).maybeSingle(),
      db.from("workouts").select("id, type, distance_km, duration_min, note, is_private").eq("day", day).in("is_private", privacy),
      db
        .from("time_logs")
        .select("id, started_at, ended_at, duration_min, content, note, is_private, time_categories(name), media(title)")
        .eq("day", day)
        .in("is_private", privacy)
        .order("started_at"),
      db
        .from("work_sessions")
        .select("id, started_at, ended_at, duration_min, subject, description, is_private, work_categories(name)")
        .eq("day", day)
        .in("is_private", privacy)
        .order("started_at"),
      db
        .from("reflections")
        .select("id, kind, content, reason, is_private")
        .eq("day", day)
        .in("is_private", privacy)
        .order("kind")
        .order("sort_order"),
      db
        .from("learnings")
        .select("id, title, insight, kind, context, next_action, is_private, media(title), learning_tags(tags(name))")
        .eq("day", day)
        .in("is_private", privacy)
        .order("created_at"),
      db
        .from("commitments")
        .select("id, made_on, content, result, review_note, is_private")
        .eq("made_on", day)
        .in("is_private", privacy)
        .order("created_at"),
      db
        .from("commitments")
        .select("id, made_on, content, result, review_note, is_private")
        .eq("reviewed_on", day)
        .in("is_private", privacy)
        .order("created_at"),
    ]);

  const d = check(dayRow);
  const name = (v: unknown) => (v as { name: string } | null)?.name ?? null;
  const title = (v: unknown) => (v as { title: string } | null)?.title ?? null;

  return {
    day,
    mood: d && (includePrivate || !d.is_private) ? d.mood : null,
    sleep: check(sleep),
    bedTonight: check(nextSleep)?.bed_at ?? null,
    office: check(office),
    workouts: check(workouts) ?? [],
    timeLogs: (check(timeLogs) ?? []).map((t) => ({
      id: t.id,
      started_at: t.started_at,
      ended_at: t.ended_at,
      duration_min: t.duration_min,
      category: name(t.time_categories),
      label: title(t.media) ?? t.content,
      detail: title(t.media) ? t.content : t.note,
      is_private: t.is_private,
    })),
    workSessions: (check(workSessions) ?? []).map((w) => ({
      id: w.id,
      started_at: w.started_at,
      ended_at: w.ended_at,
      duration_min: w.duration_min,
      category: name(w.work_categories),
      label: w.description,
      detail: w.subject,
      is_private: w.is_private,
    })),
    reflections: (check(reflections) ?? []) as Reflection[],
    learnings: (check(learnings) ?? []).map((l) => ({
      id: l.id,
      title: l.title,
      insight: l.insight,
      kind: l.kind as LearningKind,
      context: l.context,
      next_action: l.next_action,
      media: title(l.media),
      tags: (l.learning_tags as unknown as { tags: { name: string } | null }[]).flatMap((lt) => (lt.tags ? [lt.tags.name] : [])),
      is_private: l.is_private,
    })),
    commitmentsMade: (check(made) ?? []) as Commitment[],
    commitmentsReviewed: (check(reviewed) ?? []) as Commitment[],
  };
}

// 指定日に期間中の習慣と、その日までの連続日数・達成数・直近14日
export async function loadHabits(day: string, includePrivate: boolean): Promise<HabitSummary[]> {
  await connection();
  const db = createAdminClient();
  const habits =
    check(
      await db
        .from("habits")
        .select("id, name, description, start_on, end_on")
        .in("is_private", includePrivate ? [true, false] : [false])
        .lte("start_on", day)
        .gte("end_on", day)
        .order("start_on"),
    ) ?? [];
  if (habits.length === 0) return [];

  const days =
    check(
      await db
        .from("habit_days")
        .select("habit_id, day, done")
        .in("habit_id", habits.map((h) => h.id))
        .lte("day", day)
        .order("day"),
    ) ?? [];

  return habits.map((h) => {
    const mine = days.filter((d) => d.habit_id === h.id);
    // その日がまだ未達なら、前日までの連続で数える
    let streak = 0;
    for (let i = mine.length - 1; i >= 0; i--) {
      if (mine[i].done) streak++;
      else if (i === mine.length - 1 && mine[i].day === day) continue;
      else break;
    }
    return {
      ...h,
      streak,
      achieved: mine.filter((d) => d.done).length,
      elapsed: mine.length,
      recent: mine.slice(-14).map(({ day, done }) => ({ day, done })),
    };
  });
}
