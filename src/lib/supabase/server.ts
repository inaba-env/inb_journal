import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 本人確認（Supabase Auth）専用のクライアント。データの読み出しには admin.ts を使う。
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component から呼ばれたときは書き込めない。セッション更新は proxy 側で行う。
          }
        },
      },
    },
  );
}
