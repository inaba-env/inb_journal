import { Suspense } from "react";
import { signIn } from "./actions";

type SearchParams = Promise<{ error?: string }>;

const labelClass = "text-xs font-bold text-muted";
const inputClass =
  "rounded-xl border border-line bg-background px-3.5 py-2.5 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-8 px-4">
      <div className="rise flex flex-col gap-1.5">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">inb_journal</h1>
        <p className="text-sm text-muted">凡事徹底の記録</p>
      </div>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForm({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <form
      action={signIn}
      className="rise flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card"
      style={{ "--i": 1 } as React.CSSProperties}
    >
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">
          メールアドレス
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="password">
          パスワード
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">メールアドレスかパスワードが違います。</p>}
      </div>
      <button
        type="submit"
        className="mt-1 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-surface transition hover:opacity-90 active:scale-[0.98]"
      >
        ログイン
      </button>
    </form>
  );
}
