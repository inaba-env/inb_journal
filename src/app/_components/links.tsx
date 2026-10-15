import type { LinkItem } from "@/lib/data";
import { Card, CardStack, EmptyCard, HiddenNote, PrivateMark, Section } from "./ui";

// YouTube の動画は埋め込みプレーヤーにする（watch・youtu.be・shorts・embed・live の URL に対応）。
// 視聴履歴を残しにくい youtube-nocookie.com を使い、?t= の再生位置は start に引き継ぐ
function youtubeEmbedOf(url: string): { src: string; vertical: boolean } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const path = u.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = path[0] ?? null;
  else if (host === "youtube.com") {
    if (path[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(path[0])) id = path[1] ?? null;
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  const start = parseInt(u.searchParams.get("t") ?? u.searchParams.get("start") ?? "", 10);
  if (start > 0) embed.searchParams.set("start", String(start));
  return { src: embed.toString(), vertical: path[0] === "shorts" };
}

// その日に参照したリンク・残しておきたいリンク。件数は非公開の分も含めた総数（count）で出す
export function LinksSection({ links, count }: { links: LinkItem[]; count: number }) {
  return (
    <Section title="リンク" count={count}>
      {count === 0 ? (
        <EmptyCard />
      ) : (
        <CardStack>
          {links.map((l) => {
            const youtube = youtubeEmbedOf(l.url);
            return (
              <article key={l.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
                {youtube && (
                  <iframe
                    src={youtube.src}
                    title={l.title ?? "YouTube"}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className={`mb-2 w-full rounded-xl ${youtube.vertical ? "mx-auto aspect-[9/16] max-w-xs" : "aspect-video"}`}
                  />
                )}
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
            );
          })}
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
