import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export type GithubActivity = {
  id: string;
  occurred_at: string;
  kind: "commit" | "pr_opened" | "pr_merged" | "issue_opened";
  repo: string;
  number: number | null;
  title: string;
  url: string;
  is_private: boolean;
};

export type NoteCategory = {
  key: string;
  label: string;
  content_private: boolean;
  show_kind_headings: boolean;
  kinds: { id: string; label: string; show_when_empty: boolean }[];
};

export type Note = {
  id: string;
  kind_id: string;
  title: string | null;
  body: string;
  context: string | null;
  reason: string | null;
  next_action: string | null;
  media: string | null;
  tags: string[];
  is_private: boolean;
};

export type DayData = {
  day: string;
  mood: string | null;
  sleep: { bed_at: string | null; wake_at: string | null; duration_min: number | null; is_private: boolean } | null;
  // その日の夜に寝た時刻（翌日の睡眠の記録の bed_at）
  bedTonight: string | null;
  office: { arrived_at: string | null; left_at: string | null; stay_min: number | null; note: string | null } | null;
  workouts: {
    id: string;
    type: string;
    distance_km: number | null;
    duration_min: number | null;
    started_at: string | null;
    ended_at: string | null;
    note: string | null;
    is_private: boolean;
  }[];
  timeLogs: TimeBlock[];
  workSessions: TimeBlock[];
  github: GithubActivity[];
  // 画面に出す大分類（学び・振り返り・感謝 など）と、その日の記録
  noteCategories: NoteCategory[];
  notes: Note[];
  // 小分類ごとの件数。件数は公開してよいので、非公開の記録も含めて数える
  noteCounts: Record<string, number>;
};

export type ChecklistItem = { id: string; name: string; done: boolean };

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

  const [dayRow, sleep, nextSleep, office, workouts, timeLogs, workSessions, github, categories, notes, noteKinds] = await Promise.all([
    db.from("days").select("mood, is_private").eq("day", day).maybeSingle(),
    db.from("sleep_logs").select("bed_at, wake_at, duration_min, is_private").eq("day", day).in("is_private", privacy).maybeSingle(),
    db.from("sleep_logs").select("bed_at").eq("day", addDays(day, 1)).in("is_private", privacy).maybeSingle(),
    db.from("office_logs").select("arrived_at, left_at, stay_min, note").eq("day", day).in("is_private", privacy).maybeSingle(),
    db
      .from("workouts")
      .select("id, type, distance_km, duration_min, started_at, ended_at, note, is_private")
      .eq("day", day)
      .in("is_private", privacy),
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
      .from("github_activities")
      .select("id, occurred_at, kind, repo, number, title, url, is_private")
      .eq("day", day)
      .in("is_private", privacy)
      .order("occurred_at"),
    db
      .from("note_categories")
      .select("key, label, content_private, show_kind_headings, note_kinds(id, label, show_when_empty, sort_order)")
      .eq("show_on_page", true)
      .order("sort_order"),
    db
      .from("notes")
      .select("id, kind_id, title, body, context, reason, next_action, is_private, created_at, media(title), note_tags(tags(name))")
      .eq("day", day)
      .in("is_private", privacy)
      .order("created_at"),
    // 件数を出すためだけに小分類を読む（中身は読まない）
    db.from("notes").select("kind_id").eq("day", day),
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
    github: (check(github) ?? []) as GithubActivity[],
    noteCategories: (check(categories) ?? []).map((c) => ({
      key: c.key,
      label: c.label,
      content_private: c.content_private,
      show_kind_headings: c.show_kind_headings,
      kinds: [...c.note_kinds]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ id, label, show_when_empty }) => ({ id, label, show_when_empty })),
    })),
    notes: (check(notes) ?? []).map((n) => ({
      id: n.id,
      kind_id: n.kind_id,
      title: n.title,
      body: n.body,
      context: n.context,
      reason: n.reason,
      next_action: n.next_action,
      media: title(n.media),
      tags: (n.note_tags as unknown as { tags: { name: string } | null }[]).flatMap((t) => (t.tags ? [t.tags.name] : [])),
      is_private: n.is_private,
    })),
    noteCounts: (check(noteKinds) ?? []).reduce<Record<string, number>>(
      (acc, n) => ({ ...acc, [n.kind_id]: (acc[n.kind_id] ?? 0) + 1 }),
      {},
    ),
  };
}

// 凡事徹底のチェックリスト（その日に続けている項目と、その日のチェック）
export async function loadChecklist(day: string, includePrivate: boolean): Promise<ChecklistItem[]> {
  await connection();
  const db = createAdminClient();
  const items =
    check(
      await db
        .from("habits")
        .select("id, name, habit_checks(day, done)")
        .eq("in_checklist", true)
        .in("is_private", includePrivate ? [true, false] : [false])
        .lte("start_on", day)
        .or(`end_on.is.null,end_on.gte.${day}`)
        .eq("habit_checks.day", day)
        .order("sort_order"),
    ) ?? [];
  return items.map((h) => ({
    id: h.id,
    name: h.name,
    done: (h.habit_checks as { day: string; done: boolean }[]).some((c) => c.done),
  }));
}
