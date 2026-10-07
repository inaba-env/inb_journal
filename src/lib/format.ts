const WEEKDAYS = "日月火水木金土";

export function formatDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAYS[d.getUTCDay()]}）`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

// その日の 0:00（日本時間）からの経過分
export function minutesOfDay(iso: string, day: string): number {
  return (Date.parse(iso) - Date.parse(`${day}T00:00:00+09:00`)) / 60000;
}
