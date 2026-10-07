# inb_journal — 凡事徹底の記録を見るページ

学び・睡眠・習慣・数値の記録を Supabase に貯め、それを見るためだけの Web ページ。
書き込みは Claude Code から Supabase MCP で行い、Web 側には登録画面を持たない。

```
Claude Code ──(Supabase MCP)──▶ Supabase ──(秘密鍵でサーバー側から読む)──▶ Next.js ──▶ 閲覧者
```

## 誰が見られるか

| 閲覧者 | 条件 | 見えるもの |
|---|---|---|
| システムチーム | `ALLOWED_IPS` に入っている IP から来た | `is_private = false` の記録だけ |
| 本人 | `OWNER_EMAIL` でログインしている（どこからでも） | すべて（非公開の記録には「非公開」と付く） |
| それ以外 | — | `/login` に飛ばされる |

- 判定は `src/proxy.ts`（入口）と `src/lib/access.ts` の `resolveViewer`（ページ側）の2か所で行う。proxy だけに頼らない
- 本人確認は Supabase Auth のメールリンク。`shouldCreateUser: false` なので、本人のユーザーを Supabase 側に先に作っておく
- IP は `x-real-ip` / `x-forwarded-for` から取る。Vercel はこれを自分で上書きするので信用できるが、ほかの環境に置くときは前段のプロキシがヘッダーを上書きするか確認すること

## データ

テーブルは `supabase/migrations/` を参照。

| テーブル | 中身 |
|---|---|
| `learnings` | 学び（日付・タイトル・本文・タグ） |
| `sleep_logs` | 睡眠。`sleep_date` は起きた日。`duration_min` は自動計算 |
| `habits` / `habit_checks` | 期間つきの習慣目標と、日ごとの達成 |
| `metrics` / `metric_logs` | 体重・歩数など、項目を自由に増やせる数値記録 |

- 各テーブルとも RLS を有効にし、`anon` / `authenticated` には権限を与えていない（Data API から直接は読めない）
- Web が使う `service_role` には `SELECT` だけを与えている
- 公開・非公開は `learnings` / `sleep_logs` / `habits` / `metrics` の `is_private` で決める。`habit_checks` と `metric_logs` は親に従う

## ローカルで動かす

```bash
supabase start              # マイグレーションと supabase/seed.sql が入る
cp .env.example .env.local  # 値は supabase status で確認して埋める
npm run dev
```

ローカルでは IP ヘッダーが付かないので、`curl -H "x-real-ip: <ALLOWED_IPS の1つ>"` で確認する。

## 本番

- Supabase：本番プロジェクトに `supabase link` → `supabase db push`
- Vercel：環境変数に `.env.example` の5つを設定する（`SUPABASE_SECRET_KEY` には `NEXT_PUBLIC_` を付けない）
- Supabase Auth：Site URL と Redirect URL に本番の `/auth/confirm` を登録し、新規登録（Sign ups）を無効にする
