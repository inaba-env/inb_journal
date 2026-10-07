// セクションとカードの見出しは同じ形にそろえる。
// 右上には件数（count、非公開の分も含めた総数）か、時間などの量（aside）を出す
function Heading({
  title,
  icon,
  count,
  aside,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  aside?: React.ReactNode;
}) {
  const right = count !== undefined ? `${count}件` : aside;
  if (!title && !right) return null;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {icon}
        {title}
      </h2>
      {right && <span className="text-xs text-zinc-500 tabular-nums">{right}</span>}
    </div>
  );
}

export function Card({
  title,
  icon,
  count,
  aside,
  children,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <Heading title={title} icon={icon} count={count} aside={aside} />
      {children}
    </section>
  );
}

// 見出しの下にカードを縦に並べるまとまり
export function Section({
  title,
  count,
  aside,
  children,
}: {
  title: string;
  count?: number;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="px-1">
        <Heading title={title} count={count} aside={aside} />
      </div>
      {children}
    </section>
  );
}

// セクションの中の小見出し（学びの種類など）。件数の出し方はセクションと同じ
export function SubHeading({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="flex items-baseline justify-between px-1 pt-1 text-xs text-zinc-500">
      <span>{title}</span>
      <span className="tabular-nums">{count}件</span>
    </h3>
  );
}

// 記録がないとき
export function Empty() {
  return <p className="text-sm text-zinc-400">記録なし</p>;
}

// 総数のうち見えていない分（チームの画面で非公開の記録があるとき）
export function HiddenNote({ total, shown }: { total: number; shown: number }) {
  if (total <= shown) return null;
  return (
    <p className="text-xs text-zinc-500">
      {shown > 0 ? "ほか" : ""}非公開 {total - shown}件
    </p>
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

// 2つの時刻を1枚に並べるカード（起床・就寝、出社・退社）
export function PairStat({
  label,
  items,
  sub,
}: {
  label: string;
  items: { label: string; value: React.ReactNode }[];
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[11px] text-zinc-500">{item.label}</span>
            <span className="text-lg font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

// セクションの中でカードを縦に並べる
export function CardStack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}
