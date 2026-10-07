import type { GithubActivity } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { Card, CardStack, EmptyCard, PrivateMark, Section } from "./ui";

// 種類ごとの色と名前。Tailwind がクラス名を拾えるよう、文字列はそのまま書く
export const GITHUB_KIND: Record<GithubActivity["kind"], { label: string; color: string; badge: string }> = {
  pr_merged: {
    label: "PRマージ",
    color: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  pr_opened: {
    label: "PR作成",
    color: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  issue_opened: {
    label: "Issue作成",
    color: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  commit: { label: "コミット", color: "bg-zinc-400 dark:bg-zinc-500", badge: "bg-surface-2 text-muted" },
};

// リポジトリごとに1枚。PR と Issue は1件ずつ、コミットは数が多いので畳んでおく
export function GithubSection({ activities }: { activities: GithubActivity[] }) {
  const repos = new Map<string, GithubActivity[]>();
  for (const a of activities) repos.set(a.repo, [...(repos.get(a.repo) ?? []), a]);
  // 動きの多いリポジトリから並べる
  const sorted = [...repos.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <Section title="GitHub" count={activities.length}>
      {activities.length === 0 ? (
        <EmptyCard />
      ) : (
        <CardStack>
          {sorted.map(([repo, items]) => {
            const others = items.filter((a) => a.kind !== "commit");
            const commits = items.filter((a) => a.kind === "commit");
            return (
              <Card
                key={repo}
                title={<span className="font-mono text-[13px]">{repo.split("/")[1] ?? repo}</span>}
                aside={summary(items)}
              >
                {others.length > 0 && (
                  <ul className="flex flex-col gap-2.5 text-sm">
                    {others.map((a) => (
                      <ActivityRow key={a.id} a={a} />
                    ))}
                  </ul>
                )}
                {commits.length > 0 && (
                  <details className="group/commits text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                      <span className="transition-transform group-open/commits:rotate-90">›</span>
                      コミット {commits.length}件
                    </summary>
                    <ul className="mt-2.5 flex flex-col gap-2 border-l border-line pl-3">
                      {commits.map((a) => (
                        <ActivityRow key={a.id} a={a} />
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            );
          })}
        </CardStack>
      )}
    </Section>
  );
}

function summary(items: GithubActivity[]): string {
  return (Object.keys(GITHUB_KIND) as GithubActivity["kind"][])
    .map((k) => [GITHUB_KIND[k].label, items.filter((a) => a.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${label} ${n}`)
    .join("・");
}

function ActivityRow({ a }: { a: GithubActivity }) {
  return (
    <li className="grid grid-cols-[2.75rem_1fr] items-baseline gap-2">
      <span className="font-mono text-xs text-faint tabular-nums">{formatTime(a.occurred_at)}</span>
      <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 leading-relaxed hover:text-accent">
        {a.kind !== "commit" && (
          <span className={`mr-2 inline-block rounded-full px-2 py-px align-[1px] text-[11px] font-medium ${GITHUB_KIND[a.kind].badge}`}>
            {GITHUB_KIND[a.kind].label}
            {a.number != null && <span className="font-mono"> #{a.number}</span>}
          </span>
        )}
        {a.title}
        <PrivateMark show={a.is_private} />
      </a>
    </li>
  );
}
