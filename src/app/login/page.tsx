import { Suspense } from "react";
import { sendMagicLink } from "./actions";

type SearchParams = Promise<{ sent?: string; error?: string }>;

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
  const { sent, error } = await searchParams;

  return (
    <>
      {sent ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ログイン用のリンクをメールで送りました。メール内のリンクを開いてください。
        </p>
      ) : (
        <form action={sendMagicLink} className="flex flex-col gap-3">
          <label className="text-sm text-zinc-600 dark:text-zinc-400" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
            ログインリンクを送る
          </button>
          {error && <p className="text-sm text-red-600">リンクが無効か期限切れです。もう一度送ってください。</p>}
        </form>
      )}
    </>
  );
}
