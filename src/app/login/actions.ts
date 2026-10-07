"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // 本人以外のアドレスは Supabase に問い合わせず、パスワード違いと同じ表示にして、誰が本人かを漏らさない
  if (!email || email !== process.env.OWNER_EMAIL?.toLowerCase()) redirect("/login?error=1");

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=1");

  redirect("/");
}
