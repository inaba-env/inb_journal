"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// ページ全体を読み直さず、サーバーからその日の記録だけを取り直す
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="最新の記録を読み込む"
      title="最新の記録を読み込む"
      className="flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium text-ink transition hover:bg-surface-2 active:scale-[0.96] disabled:text-faint"
    >
      <svg
        viewBox="0 0 16 16"
        className={`size-4 ${pending ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1" />
        <path d="M12.5 1.5v3h-3" />
      </svg>
    </button>
  );
}
