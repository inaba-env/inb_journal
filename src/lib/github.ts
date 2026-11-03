import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export const GITHUB_OWNERS = ["e-value-inc", "inaba-env"] as const;
export type GithubOwner = (typeof GITHUB_OWNERS)[number];

export const GITHUB_CACHE_TAG = "github";

// fine-grained PAT は Resource owner ごとにしか作れないので、owner ごとに別の環境変数から読む
const TOKEN_ENV: Record<GithubOwner, string> = {
  "e-value-inc": "GITHUB_TOKEN_ORG",
  "inaba-env": "GITHUB_TOKEN_USER",
};

export type GithubRepo = {
  owner: GithubOwner;
  name: string;
  issues: number;
  prs: number;
  // draft の PR の数。開いている PR が 100 件を超えると数えきれないので null
  draftPrs: number | null;
  // `claude` ラベルが付いた開いている Issue の数
  claudeIssues: number;
};

export type GithubOwnerCounts = { fetchedAt: string; repos: GithubRepo[] };

const PR_PAGE = 100;

// 表に出さないリポジトリ（自分の管理下にないもの）。claude-runner の EXCLUDE_REPOS と同じ
const EXCLUDE_REPOS = new Set(["e-value-inc/kohei-app"]);

const REPOS_FRAGMENT = `
  pageInfo { hasNextPage endCursor }
  nodes {
    name
    issues(states: OPEN) { totalCount }
    pullRequests(states: OPEN, first: ${PR_PAGE}) { totalCount nodes { isDraft } }
    claude: issues(labels: ["claude"], states: OPEN) { totalCount }
  }
`;

// User.repositories は ownerAffiliations を渡さないと、共同作業者・組織メンバーとして見えるリポジトリも返す。
// 自分が owner のものだけにするため、User では OWNER を指定する
const QUERY = `
  query ($owner: String!, $after: String) {
    repositoryOwner(login: $owner) {
      ... on Organization { repos: repositories(first: 50, after: $after, isArchived: false) { ${REPOS_FRAGMENT} } }
      ... on User { repos: repositories(first: 50, after: $after, isArchived: false, ownerAffiliations: [OWNER]) { ${REPOS_FRAGMENT} } }
    }
  }
`;

type RepoNode = {
  name: string;
  issues: { totalCount: number };
  pullRequests: { totalCount: number; nodes: { isDraft: boolean }[] };
  claude: { totalCount: number };
};
type Connection = { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RepoNode[] };

async function query(token: string, owner: string, after: string | null): Promise<Connection> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { owner, after } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub API が ${res.status} を返しました`);
  const json = (await res.json()) as {
    data?: { repositoryOwner: { repos: Connection } | null };
    errors?: { message: string }[];
  };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(" / "));
  const repos = json.data?.repositoryOwner?.repos;
  if (!repos) throw new Error(`${owner} が見つかりません`);
  return repos;
}

// owner 1 つ分の件数。結果は 5 分キャッシュし、「再読み込み」は GITHUB_CACHE_TAG を捨てて取り直す。
// 失敗（トークンなし・API エラー）は投げる。投げた結果はキャッシュに残らない
export async function loadGithubCounts(owner: GithubOwner): Promise<GithubOwnerCounts> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(GITHUB_CACHE_TAG);

  const token = process.env[TOKEN_ENV[owner]];
  if (!token) throw new Error(`環境変数 ${TOKEN_ENV[owner]} がありません`);

  const repos: GithubRepo[] = [];
  let after: string | null = null;
  do {
    const page: Connection = await query(token, owner, after);
    for (const r of page.nodes) {
      if (EXCLUDE_REPOS.has(`${owner}/${r.name}`)) continue;
      repos.push({
        owner,
        name: r.name,
        issues: r.issues.totalCount,
        prs: r.pullRequests.totalCount,
        draftPrs:
          r.pullRequests.totalCount > PR_PAGE ? null : r.pullRequests.nodes.filter((n) => n.isDraft).length,
        claudeIssues: r.claude.totalCount,
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return { fetchedAt: new Date().toISOString(), repos };
}

// GitHub のそのリポジトリの一覧（絞り込み済み）
export function githubListUrl(
  repo: Pick<GithubRepo, "owner" | "name">,
  kind: "issues" | "prs" | "draft-prs" | "claude",
): string {
  const base = `https://github.com/${repo.owner}/${encodeURIComponent(repo.name)}`;
  const q = {
    issues: ["issues", "is:issue is:open"],
    claude: ["issues", "is:issue is:open label:claude"],
    prs: ["pulls", "is:pr is:open"],
    "draft-prs": ["pulls", "is:pr is:open draft:true"],
  }[kind];
  return `${base}/${q[0]}?q=${encodeURIComponent(q[1])}`;
}
