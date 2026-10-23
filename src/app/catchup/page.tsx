import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { resolveViewer } from "@/lib/access";
import { type CatchupItem, type CatchupReport, type CatchupSection, loadCatchup } from "@/lib/catchup";
import { todayJst } from "@/lib/date";
import { Card, CardStack, Pill, PrivateMark, Section } from "../_components/ui";
import { Feedback } from "./feedback";

export const metadata: Metadata = { title: "キャッチアップ | inb_journal" };

const SECTIONS: { key: CatchupSection; label: string }[] = [
  { key: "ai_tools", label: "AIツール" },
  { key: "discussion", label: "海外エンジニアの議論" },
  { key: "interest", label: "興味ごと" },
  { key: "vuln", label: "今週の脆弱性" },
];

// 週次レポート（月曜9時に前の週の分）と、直近の緊急の脆弱性を出す。?r=<id> で過去の週を選ぶ。
// 通勤中にスマホで読む前提なので、幅は読みやすい長さで止め、一覧は見出しだけにして中身は押して開く
export default function CatchupRoute({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Suspense fallback={<Loading />}>
        <CatchupPage searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CatchupPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await connection();
  const viewer = await resolveViewer(await headers());
  if (viewer.kind === "none") redirect("/login");
  const isOwner = viewer.kind === "owner";

  const { r } = await searchParams;
  const { weekly, alerts, weeklyList, scope } = await loadCatchup(r, isOwner, todayJst());

  return (
    <>
      <header className="rise flex flex-col gap-2 pt-2">
        <Link href="/" className="text-sm font-medium text-muted hover:text-accent">
          ‹ 記録へ
        </Link>
        <h1 className="text-3xl leading-none font-bold tracking-tight sm:text-4xl">キャッチアップ</h1>
        {weekly && (
          <p className="font-mono text-sm text-muted tabular-nums">
            {period(weekly)}
            <PrivateMark show={isOwner && weekly.is_private} />
          </p>
        )}
      </header>

      {alerts.length > 0 && (
        <Section title="緊急の脆弱性" count={alerts.reduce((n, a) => n + a.items.length, 0)}>
          <CardStack>
            {alerts.flatMap((a) =>
              a.items.map((item) => <AlertCard key={item.id} item={item} day={a.period_start} isOwner={isOwner} />),
            )}
          </CardStack>
        </Section>
      )}

      {weekly ? <WeeklyReport report={weekly} isOwner={isOwner} /> : <Card>まだ週次レポートはありません。毎週月曜の9時に前の週の分ができます。</Card>}

      {isOwner && (
        <Section title="今の関心の範囲" collapsible>
          <Card>
            {scope ? (
              <ScopeBody body={scope.body} />
            ) : (
              <p className="text-sm text-muted">まだありません。各項目に「関心あり／知っておくべき／範囲外」やメモを付けると、次のレポートを作るときにここにまとめます。</p>
            )}
          </Card>
        </Section>
      )}

      {weeklyList.length > 1 && (
        <Section title="過去のレポート" collapsible>
          <Card>
            <ul className="flex flex-col gap-1.5 font-mono text-sm tabular-nums">
              {weeklyList.map((w) => (
                <li key={w.id}>
                  {w.id === weekly?.id ? (
                    <span className="text-faint">{period(w)}（表示中）</span>
                  ) : (
                    <Link href={`/catchup?r=${w.id}`} className="hover:text-accent">
                      {period(w)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}
    </>
  );
}

function WeeklyReport({ report, isOwner }: { report: CatchupReport; isOwner: boolean }) {
  const featured = report.items.filter((i) => i.featured);
  return (
    <>
      {report.headline && (
        <Card>
          <p className="text-[15px] leading-relaxed">{report.headline}</p>
        </Card>
      )}
      {featured.length > 0 && (
        <Section title="今週のトップ" count={featured.length}>
          <CardStack>
            {featured.map((item) => (
              <FeaturedCard key={item.id} item={item} isOwner={isOwner} />
            ))}
          </CardStack>
        </Section>
      )}
      {SECTIONS.map(({ key, label }) => {
        const items = report.items.filter((i) => !i.featured && i.section === key);
        if (items.length === 0) return null;
        return (
          <Section key={key} title={label} count={items.length}>
            <Card>
              <ul className="flex flex-col divide-y divide-line">
                {items.map((item) => (
                  <ItemRow key={item.id} item={item} isOwner={isOwner} />
                ))}
              </ul>
            </Card>
          </Section>
        );
      })}
    </>
  );
}

// トップは見出しと要約まで出し、賛否と「試すなら」は押して開く
function FeaturedCard({ item, isOwner }: { item: CatchupItem; isOwner: boolean }) {
  const section = SECTIONS.find((s) => s.key === item.section)?.label;
  const hasMore = item.pro || item.con || item.voices || item.action;
  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className="text-xs text-faint">{[section, item.source].filter(Boolean).join("・")}</p>
      <h3 className="text-[16px] leading-snug font-bold">{item.title}</h3>
      <p className="text-sm leading-relaxed text-ink/90">{item.summary}</p>
      {hasMore && (
        <details className="group/more">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition-transform group-open/more:rotate-90">›</span>
            {item.pro || item.con || item.voices ? "賛否と試すなら" : "試すなら"}
          </summary>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {(item.pro || item.con || item.voices) && (
              <dl className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3.5 text-sm leading-relaxed">
                <Point label="賛成" text={item.pro} />
                <Point label="反対" text={item.con} />
                <Point label="使った人の声" text={item.voices} />
              </dl>
            )}
            <Action item={item} />
          </div>
        </details>
      )}
      <Links item={item} />
      {isOwner && <Feedback itemId={item.id} initial={item.feedback} initialNote={item.feedback_note} />}
    </article>
  );
}

function Point({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

function Action({ item }: { item: CatchupItem }) {
  if (!item.action) return null;
  return (
    <p className="text-sm leading-relaxed">
      <span className="mr-2 font-bold text-accent">{item.section === "vuln" ? "対応" : "試すなら"}</span>
      {item.action}
    </p>
  );
}

// 一覧は見出しだけ。押すと要約・リンク・反応のボタンが開く。反応を付けたものは見出しの横に印を出す
function ItemRow({ item, isOwner }: { item: CatchupItem; isOwner: boolean }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <details className="group/row">
        <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
          <span className="mt-px text-muted transition-transform group-open/row:rotate-90">›</span>
          <span className="flex-1 text-[15px] leading-snug font-bold">
            {item.title}
            {item.severity && (
              <span className="ml-2 align-middle">
                <Pill>{item.severity}</Pill>
              </span>
            )}
          </span>
          {isOwner && item.feedback && <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" aria-label="反応済み" />}
        </summary>
        <div className="mt-2 flex flex-col gap-2.5 pl-4">
          {item.source && <p className="text-xs text-faint">{item.source}</p>}
          <p className="text-sm leading-relaxed text-ink/80">{item.summary}</p>
          <Action item={item} />
          <Links item={item} />
          {isOwner && <Feedback itemId={item.id} initial={item.feedback} initialNote={item.feedback_note} />}
        </div>
      </details>
    </li>
  );
}

function AlertCard({ item, day, isOwner }: { item: CatchupItem; day: string; isOwner: boolean }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-line border-l-4 border-l-accent bg-surface p-5 shadow-card">
      <p className="flex items-center gap-2 font-mono text-xs text-faint tabular-nums">
        {day.slice(5).replace("-", "/")}
        {item.severity && <Pill>{item.severity}</Pill>}
      </p>
      <h3 className="text-[15px] leading-snug font-bold">{item.title}</h3>
      <p className="text-sm leading-relaxed text-ink/90">{item.summary}</p>
      <Action item={item} />
      <Links item={item} />
      {isOwner && <Feedback itemId={item.id} initial={item.feedback} initialNote={item.feedback_note} />}
    </article>
  );
}

// 元記事・議論へのリンク
function Links({ item }: { item: CatchupItem }) {
  if (!item.url && !item.thread_url) return null;
  return (
    <div className="flex gap-3 text-xs font-medium">
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          元の記事 ↗
        </a>
      )}
      {item.thread_url && item.thread_url !== item.url && (
        <a href={item.thread_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          議論を読む ↗
        </a>
      )}
    </div>
  );
}

// 関心の範囲（「## 見出し」と「- 箇条書き」だけの Markdown）
function ScopeBody({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm leading-relaxed">
      {body.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith("## "))
          return (
            <h3 key={i} className="pt-2 text-xs font-bold text-muted first:pt-0">
              {t.slice(3)}
            </h3>
          );
        return <p key={i}>{t.replace(/^[-*]\s*/, "・")}</p>;
      })}
    </div>
  );
}

function period(r: { period_start: string; period_end: string }): string {
  const f = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return r.period_start === r.period_end ? f(r.period_start) : `${f(r.period_start)}〜${f(r.period_end)}`;
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
