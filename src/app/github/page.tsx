import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { resolveViewer } from "@/lib/access";
import { formatTime } from "@/lib/format";
import {
  GITHUB_OWNERS,
  type GithubOwner,
  type GithubOwnerCounts,
  type GithubRepo,
  githubListUrl,
  loadGithubCounts,
} from "@/lib/github";
import { RefreshButton } from "../_components/refresh-button";
import { Card, Section } from "../_components/ui";
import { refreshGithub } from "./actions";

export const metadata: Metadata = { title: "GitHub | inb_journal" };

// 本人だけが見られる。リポジトリごとの開いている Issue・PR の数を GitHub から読んで出す（Supabase には入れない）
export default function GithubRoute() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Suspense fallback={<Loading />}>
        <GithubPage />
      </Suspense>
    </main>
  );
}

type OwnerResult = { owner: GithubOwner } & ({ ok: true; data: GithubOwnerCounts } | { ok: false; error: string });

async function GithubPage() {
  await connection();
  const viewer = await resolveViewer(await headers());
  if (viewer.kind !== "owner") redirect("/login");

  const results: OwnerResult[] = await Promise.all(
    GITHUB_OWNERS.map(async (owner): Promise<OwnerResult> => {
      try {
        return { owner, ok: true, data: await loadGithubCounts(owner) };
      } catch (e) {
        return { owner, ok: false, error: e instanceof Error ? e.message : "取得に失敗しました" };
      }
    }),
  );

  // 開いている Issue と PR の合計が多い順。どちらも 0 件のリポジトリは出さない
  const repos = results
    .flatMap((r) => (r.ok ? r.data.repos : []))
    .filter((r) => r.issues + r.prs > 0)
    .sort((a, b) => b.issues + b.prs - (a.issues + a.prs) || a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name));
  // 片方が失敗したときは、成功した側の取得時刻のうち古いほうを出す
  const fetchedAt = results
    .flatMap((r) => (r.ok ? [r.data.fetchedAt] : []))
    .sort()
    .at(0);

  return (
    <>
      <header className="rise flex flex-col gap-2 pt-2">
        <Link href="/" className="text-sm font-medium text-muted hover:text-accent">
          ‹ 記録へ
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl leading-none font-bold tracking-tight sm:text-4xl">GitHub</h1>
          <RefreshButton action={refreshGithub} label="GitHub から取り直す" />
        </div>
        {fetchedAt && <p className="font-mono text-sm text-muted tabular-nums">{formatFetchedAt(fetchedAt)} 時点</p>}
      </header>

      <Section title="owner ごとの合計">
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <OwnerTotal key={r.owner} result={r} />
          ))}
        </div>
      </Section>

      <Section title="リポジトリ" count={repos.length}>
        {repos.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">開いている Issue・PR があるリポジトリはありません。</p>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">リポジトリ</th>
                  <th className="pb-2 text-right font-medium">Issue</th>
                  <th className="pb-2 text-right font-medium">PR（うち draft）</th>
                  <th className="pb-2 text-right font-medium">claude 待ち</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {repos.map((repo) => (
                  <RepoRow key={`${repo.owner}/${repo.name}`} repo={repo} />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>
    </>
  );
}

function OwnerTotal({ result }: { result: OwnerResult }) {
  return (
    <Card title={result.owner}>
      {result.ok ? (
        <dl className="grid grid-cols-3 gap-2 font-mono tabular-nums">
          <Total label="Issue" value={sum(result.data.repos, (r) => r.issues)} />
          <Total label="PR" value={sum(result.data.repos, (r) => r.prs)} />
          <Total label="claude 待ち" value={sum(result.data.repos, (r) => r.claudeIssues)} />
        </dl>
      ) : (
        <p className="text-sm break-words text-accent">取得できませんでした：{result.error}</p>
      )}
    </Card>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-sans text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

function RepoRow({ repo }: { repo: GithubRepo }) {
  return (
    <tr className="font-mono tabular-nums">
      <th scope="row" className="py-2.5 pr-3 text-left font-sans font-medium break-all">
        <span className="text-faint">{repo.owner}/</span>
        {repo.name}
      </th>
      <td className="py-2.5 text-right">
        <Count href={githubListUrl(repo, "issues")} n={repo.issues} />
      </td>
      <td className="py-2.5 text-right">
        <Count href={githubListUrl(repo, "prs")} n={repo.prs} />
        {repo.draftPrs !== 0 && (
          <span className="ml-1 text-xs text-muted">
            （
            {repo.draftPrs === null ? (
              "draft 不明"
            ) : (
              <a href={githubListUrl(repo, "draft-prs")} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                {repo.draftPrs}
              </a>
            )}
            ）
          </span>
        )}
      </td>
      <td className="py-2.5 text-right">
        <Count href={githubListUrl(repo, "claude")} n={repo.claudeIssues} />
      </td>
    </tr>
  );
}

// 0 件は押しても何も出ないので、リンクにせず薄く出す
function Count({ href, n }: { href: string; n: number }) {
  if (n === 0) return <span className="text-faint">0</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-bold text-accent hover:underline">
      {n}
    </a>
  );
}

function sum(repos: GithubRepo[], pick: (r: GithubRepo) => number): number {
  return repos.reduce((n, r) => n + pick(r), 0);
}

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });
  return `${date} ${formatTime(iso)}`;
}

function Loading() {
  const block = "animate-pulse rounded-2xl bg-surface-2";
  return (
    <div className="flex flex-col gap-6" aria-label="読み込み中">
      <div className={`${block} h-16 w-56`} />
      <div className={`${block} h-24`} />
      <div className={`${block} h-72`} />
    </div>
  );
}
