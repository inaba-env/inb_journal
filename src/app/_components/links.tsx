import type { LinkItem } from "@/lib/data";
import { Card, CardStack, EmptyCard, HiddenNote, PrivateMark, Section } from "./ui";

// その日に参照したリンク・残しておきたいリンク。件数は非公開の分も含めた総数（count）で出す
export function LinksSection({ links, count }: { links: LinkItem[]; count: number }) {
  return (
    <Section title="リンク" count={count}>
      {count === 0 ? (
        <EmptyCard />
      ) : (
        <CardStack>
          {links.map((l) => (
            <article key={l.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
              {l.media && <p className="text-xs text-faint">{l.media}</p>}
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className={`text-[15px] leading-snug font-bold hover:text-accent ${l.title ? "" : "font-mono text-[13px] break-all"}`}
              >
                {l.title ?? l.url}
                <PrivateMark show={l.is_private} />
              </a>
              {l.title && <p className="font-mono text-xs break-all text-faint">{l.url}</p>}
              {l.note && <p className="text-sm leading-relaxed whitespace-pre-line text-ink/80">{l.note}</p>}
            </article>
          ))}
          {links.length < count && (
            <Card>
              <HiddenNote total={count} shown={links.length} />
            </Card>
          )}
        </CardStack>
      )}
    </Section>
  );
}
