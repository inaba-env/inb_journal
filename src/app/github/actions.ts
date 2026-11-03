"use server";

import { updateTag } from "next/cache";
import { ownerEmail } from "@/lib/access";
import { GITHUB_CACHE_TAG } from "@/lib/github";

// 「再読み込み」。キャッシュを捨てて、次の表示で GitHub から取り直す。本人だけが呼べる
export async function refreshGithub() {
  if (!(await ownerEmail())) throw new Error("Unauthorized");
  updateTag(GITHUB_CACHE_TAG);
}
