import type { GithubActivity } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { Card, CardStack, Empty, PrivateMark, Section } from "./ui";

// 種類ごとの色と名前。Tailwind がクラス名を拾えるよう、文字列はそのまま書く
export const GITHUB_KIND: Record<GithubActivity["kind"], { label: string; color: string }> = {
  pr_merged: { label: "PRマージ", color: "bg-violet-500" },
  pr_opened: { label: "PR作成", color: "bg-emerald-500" },
  issue_opened: { label: "Issue作成", color: "bg-amber-500" },
  commit: { label: "コミット", color: "bg-zinc-400 dark:bg-zinc-500" },
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
        <Card>
          <Empty />
        </Card>
      ) : (
        <CardStack>
          {sorted.map(([repo, items]) => {
            const others = items.filter((a) => a.kind !== "commit");
            const commits = items.filter((a) => a.kind === "commit");
            return (
              <Card key={repo} title={repo.split("/")[1] ?? repo} aside={summary(items)}>
                {others.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {others.map((a) => (
                      <ActivityRow key={a.id} a={a} />
                    ))}
                  </ul>
                )}
                {commits.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-zinc-500">コミット {commits.length}件</summary>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
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
    <li className="grid grid-cols-[3rem_auto_1fr] items-start gap-2">
      <span className="tabular-nums text-zinc-500">{formatTime(a.occurred_at)}</span>
      <span className={`mt-[0.3em] size-2.5 self-start rounded-sm ${GITHUB_KIND[a.kind].color}`} />
      <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 hover:underline">
        {a.kind !== "commit" && (
          <span className="mr-2 text-zinc-500">
            {GITHUB_KIND[a.kind].label}
            {a.number != null && ` #${a.number}`}
          </span>
        )}
        {a.title}
        <PrivateMark show={a.is_private} />
      </a>
    </li>
  );
}
