import type { AppleMusicLink } from "@/lib/data";
import { Card, CardStack, EmptyCard, HiddenNote, PrivateMark, Section } from "./ui";

// 曲・アルバム・プレイリストは Apple の埋め込みプレーヤーにする。
// 曲（/song/ か、アルバムの URL に ?i= が付いたもの）は1曲分の高さ、それ以外は曲の一覧が見える高さ
function embedOf(url: string): { src: string; height: number } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== "music.apple.com") return null;
  // /jp/album/<名前>/<id> の2つ目が種類
  const type = u.pathname.split("/")[2];
  if (!["song", "album", "playlist"].includes(type)) return null;
  u.hostname = "embed.music.apple.com";
  return { src: u.toString(), height: type === "song" || u.searchParams.has("i") ? 175 : 450 };
}

// 聴いた・残しておきたい Apple Music のリンク。件数は非公開の分も含めた総数（count）で出す
export function AppleMusicSection({ links, count }: { links: AppleMusicLink[]; count: number }) {
  return (
    <Section title="Apple Music" count={count}>
      {count === 0 ? (
        <EmptyCard />
      ) : (
        <CardStack>
          {links.map((l) => {
            const embed = embedOf(l.url);
            const heading = [l.title, l.artist].filter(Boolean).join(" — ");
            return (
              <article key={l.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-card">
                {embed ? (
                  <iframe
                    src={embed.src}
                    title={heading || "Apple Music"}
                    height={embed.height}
                    loading="lazy"
                    allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    className="w-full overflow-hidden rounded-xl"
                  />
                ) : (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-2 pt-2 text-[15px] leading-snug font-bold hover:text-accent ${heading ? "" : "font-mono text-[13px] break-all"}`}
                  >
                    {heading || l.url}
                  </a>
                )}
                {(l.note || l.is_private) && (
                  <p className="px-2 pb-1 text-sm leading-relaxed whitespace-pre-line text-ink/80">
                    {l.note}
                    <PrivateMark show={l.is_private} />
                  </p>
                )}
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
