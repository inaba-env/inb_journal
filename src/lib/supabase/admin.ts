import "server-only";
import { createClient } from "@supabase/supabase-js";

// 秘密鍵でテーブルを読むクライアント。ブラウザには絶対に渡さない。
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
