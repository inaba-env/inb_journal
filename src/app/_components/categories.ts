// カテゴリごとの色。Tailwind がクラス名を拾えるよう、文字列はそのまま書く
const TIME: Record<string, string> = {
  開発: "bg-indigo-500",
  読書: "bg-amber-500",
  Audible: "bg-orange-500",
  ポッドキャスト: "bg-rose-500",
  "書籍・ポッドキャスト": "bg-amber-400",
  その他インプット: "bg-teal-500",
  その他アウトプット: "bg-violet-500",
  ジャーナリング: "bg-emerald-500",
  業務: "bg-slate-400",
};

const WORK: Record<string, string> = {
  時短ヒーロー: "bg-sky-500",
  odesser: "bg-fuchsia-500",
  ナカダイ: "bg-lime-500",
  鈴木商会: "bg-cyan-500",
  "CC・トークノート": "bg-pink-500",
  "資料・検討": "bg-violet-500",
  "読書・調査": "bg-amber-500",
  "環境・秘書": "bg-zinc-400",
};

export function timeColor(category: string | null): string {
  return (category && TIME[category]) || "bg-zinc-300 dark:bg-zinc-600";
}

export function workColor(category: string | null): string {
  return (category && WORK[category]) || "bg-zinc-300 dark:bg-zinc-600";
}
