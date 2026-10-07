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
- 本人確認は Supabase Auth のメールアドレス＋パスワード。メールのリンク方式は、標準のメール送信が1時間に2通ほどしか送れず、開く端末が違うと失敗するのでやめた
- パスワードは `scripts/set-owner-password.sh` で付ける（`.env.local` の接続先に対して実行される）
- IP は `x-real-ip` / `x-forwarded-for` から取る。Vercel はこれを自分で上書きするので信用できるが、ほかの環境に置くときは前段のプロキシがヘッダーを上書きするか確認すること

## データ

テーブルは `supabase/migrations/` を参照。何をどのテーブルに入れるかは `docs/recording-rules.md` にまとめている。

| テーブル | 中身 |
|---|---|
| `notes` | その日に書き留めたこと（学び・振り返り・感謝・音楽）。大分類 `note_categories`・小分類 `note_kinds` で分け、画面はこの分け方どおりにセクション・小見出し・カードで出す |
| `sleep_logs` | 睡眠。`day` は起きた日。`duration_min` は自動計算 |
| `habits` / `habit_checks` | 凡事徹底のチェックリストの項目（`in_checklist`）と、日ごとのチェック |
| `metrics` / `metric_logs` | 体重・歩数など、項目を自由に増やせる数値記録 |

- 各テーブルとも RLS を有効にし、`anon` / `authenticated` には権限を与えていない（Data API から直接は読めない）
- Web が使う `service_role` には `SELECT` だけを与えている。書き込みは `~/.secretary/bin/journal-sync.py` が呼ぶ置き換え関数（`replace_work_sessions` / `replace_github_activities`）を通してだけ行える
- 公開・非公開は各テーブルの `is_private` で決める（`notes` / `sleep_logs` / `habits` / `metrics` など）。件数は非公開の分も含めて出す。`habit_checks` と `metric_logs` は親に従う

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
- Supabase Auth：新規登録（Sign ups）を無効にし、本人のユーザーを作ってから `scripts/set-owner-password.sh` でパスワードを付ける
