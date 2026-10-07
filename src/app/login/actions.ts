"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // 本人以外のアドレスでも送信済み画面に進め、誰が本人かを漏らさない
  if (email && email === process.env.OWNER_EMAIL?.toLowerCase()) {
    const origin = (await headers()).get("origin");
    const supabase = await createAuthClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` },
    });
  }

  redirect("/login?sent=1");
}
