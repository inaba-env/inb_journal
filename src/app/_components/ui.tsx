export function Card({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {icon}
          {title}
        </h2>
        {aside && <span className="text-xs text-zinc-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function PrivateMark({ show }: { show: boolean }) {
  return show ? (
    <span className="ml-1.5 rounded bg-zinc-200 px-1 align-middle text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      非公開
    </span>
  ) : null;
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

// カードを並べる見出し付きのまとまり（中身は呼び出し側のカード）
export function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h2>
        {aside && <span className="text-xs text-zinc-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
