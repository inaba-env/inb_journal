import type { Note, NoteCategory } from "@/lib/data";
import { Card, CardStack, EmptyCard, HiddenNote, PrivateMark, Section, SubHeading } from "./ui";

// 大分類＝セクション、小分類＝小見出し、記録＝カード。学び・振り返り・感謝をすべてこの1つで描く。
// 件数は非公開の記録も含めた総数（counts）で出し、見えない分は「非公開 N件」と添える
export function NotesSection({ category, notes, counts }: { category: NoteCategory; notes: Note[]; counts: Record<string, number> }) {
  const total = category.kinds.reduce((sum, k) => sum + (counts[k.id] ?? 0), 0);

  if (!category.show_kind_headings) {
    const ids = new Set(category.kinds.map((k) => k.id));
    return (
      <Section title={category.label} count={total}>
        <KindCards notes={notes.filter((n) => ids.has(n.kind_id))} count={total} hideContent={category.content_private} />
      </Section>
    );
  }

  return (
    <Section title={category.label} count={total}>
      {category.kinds
        .filter((k) => k.show_when_empty || (counts[k.id] ?? 0) > 0)
        .map((k) => (
          <div key={k.id} className="flex flex-col gap-2">
            <SubHeading title={k.label} count={counts[k.id] ?? 0} />
            <KindCards notes={notes.filter((n) => n.kind_id === k.id)} count={counts[k.id] ?? 0} hideContent={category.content_private} />
          </div>
        ))}
    </Section>
  );
}

function KindCards({ notes, count, hideContent }: { notes: Note[]; count: number; hideContent: boolean }) {
  if (count === 0) {
    return <EmptyCard />;
  }
  return (
    <CardStack>
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} hidePrivateMark={hideContent} />
      ))}
      {notes.length < count && (
        <Card>
          <HiddenNote total={count} shown={notes.length} />
        </Card>
      )}
    </CardStack>
  );
}

function NoteCard({ note: n, hidePrivateMark }: { note: Note; hidePrivateMark: boolean }) {
  const mark = <PrivateMark show={n.is_private && !hidePrivateMark} />;
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card">
      {(n.media || n.context) && <p className="text-xs text-faint">{[n.media, n.context].filter(Boolean).join("・")}</p>}
      {n.title && (
        <h3 className="text-[15px] leading-snug font-bold">
          {n.title}
          {mark}
        </h3>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-line text-ink/80">
        {n.body}
        {!n.title && mark}
      </p>
      {(n.reason || n.next_action) && (
        <dl className="mt-1 flex flex-col gap-1.5 border-l-2 border-accent-soft pl-3 text-sm leading-relaxed">
          {n.reason && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-xs leading-6 font-bold text-muted">理由</dt>
              <dd className="text-muted">{n.reason}</dd>
            </div>
          )}
          {n.next_action && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-xs leading-6 font-bold text-accent">次に</dt>
              <dd className="text-ink/80">{n.next_action}</dd>
            </div>
          )}
        </dl>
      )}
      {n.tags.length > 0 && (
        <p className="flex flex-wrap gap-1.5 pt-1">
          {n.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
              #{t}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
