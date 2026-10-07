import { Suspense } from "react";
import { signIn } from "./actions";

type SearchParams = Promise<{ error?: string }>;

const labelClass = "text-sm text-zinc-600 dark:text-zinc-400";
const inputClass = "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold">inb_journal</h1>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForm({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <form action={signIn} className="flex flex-col gap-3">
      <label className={labelClass} htmlFor="email">
        メールアドレス
      </label>
      <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      <label className={labelClass} htmlFor="password">
        パスワード
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
        ログイン
      </button>
      {error && <p className="text-sm text-red-600">メールアドレスかパスワードが違います。</p>}
    </form>
  );
}
