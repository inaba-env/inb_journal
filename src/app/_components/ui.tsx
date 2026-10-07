// セクションとカードの見出しは同じ形にそろえる。
// 右上には件数（count、非公開の分も含めた総数）か、時間などの量（aside）を出す
function Heading({
  title,
  icon,
  count,
  aside,
  large = false,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  aside?: React.ReactNode;
  large?: boolean;
}) {
  const right = count !== undefined ? `${count}件` : aside;
  if (!title && !right) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        className={
          "flex min-w-0 items-center gap-2 font-bold text-ink " + (large ? "text-[17px] tracking-tight" : "text-sm")
        }
      >
        {icon}
        {title}
      </h2>
      {right && <Pill muted={count === 0}>{right}</Pill>}
    </div>
  );
}

// 件数や時間を出す小さな丸い札
export function Pill({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={
        "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums " +
        (muted ? "text-faint" : "bg-surface-2 text-muted")
      }
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  icon,
  count,
  aside,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}>
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
    <section className="flex flex-col gap-3">
      <div className="px-1">
        <Heading title={title} count={count} aside={aside} large />
      </div>
      {children}
    </section>
  );
}

// セクションの中の小見出し（学びの種類など）。件数の出し方はセクションと同じ
export function SubHeading({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="flex items-center gap-3 px-1 pt-1 text-xs font-medium text-muted">
      <span>{title}</span>
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono tabular-nums text-faint">{count}件</span>
    </h3>
  );
}

// 記録がないとき。中身のあるカードより一段引っ込めて、破線の枠だけにする
export function EmptyCard() {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-4 text-sm text-faint">記録なし</div>
  );
}

// 総数のうち見えていない分（チームの画面で非公開の記録があるとき）
export function HiddenNote({ total, shown }: { total: number; shown: number }) {
  if (total <= shown) return null;
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <LockGlyph />
      {shown > 0 ? "ほか" : ""}非公開 {total - shown}件
    </p>
  );
}

export function PrivateMark({ show }: { show: boolean }) {
  return show ? (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-line px-1.5 align-middle text-[10px] font-normal text-muted">
      <LockGlyph />
      非公開
    </span>
  ) : null;
}

// 鍵の形。文字の大きさに合わせる
function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-[1em]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

// 上の段に並べる数値のタイル。値が無いときは薄く出す
export function Metric({
  label,
  items,
  sub,
  className = "",
}: {
  label: string;
  items: { label: string; value: string | null }[];
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <span className="text-xs font-bold text-muted">{label}</span>
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <span className="text-[11px] text-faint">{item.label}</span>
            <span
              className={
                "font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums " +
                (item.value ? "text-ink" : "text-faint/60")
              }
            >
              {item.value ?? "--"}
            </span>
          </div>
        ))}
      </div>
      <span className="min-h-4 text-xs text-muted">{sub}</span>
    </div>
  );
}

// セクションの中でカードを縦に並べる
export function CardStack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}
