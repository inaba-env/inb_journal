import type { Note, NoteCategory } from "@/lib/data";
import { Card, CardStack, Empty, HiddenNote, PrivateMark, Section, SubHeading } from "./ui";

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
    return (
      <Card>
        <Empty />
      </Card>
    );
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
    <Card
      title={
        n.title ? (
          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {n.title}
            {mark}
          </span>
        ) : undefined
      }
    >
      <div className={`flex flex-col gap-1 ${n.title ? "-mt-2" : ""}`}>
        {(n.media || n.context) && <p className="text-xs text-zinc-500">{[n.media, n.context].filter(Boolean).join("・")}</p>}
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {n.body}
          {!n.title && mark}
        </p>
        {n.reason && <p className="text-sm text-zinc-500">理由：{n.reason}</p>}
        {n.next_action && <p className="text-sm text-zinc-500">→ {n.next_action}</p>}
        {n.tags.length > 0 && (
          <p className="flex flex-wrap gap-1 pt-1">
            {n.tags.map((t) => (
              <span key={t} className="rounded bg-zinc-100 px-1.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {t}
              </span>
            ))}
          </p>
        )}
      </div>
    </Card>
  );
}
