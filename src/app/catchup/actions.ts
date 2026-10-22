"use server";

import { ownerEmail } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// 「役に立った／いらない」。本人だけが押せる。value が null なら取り消す
export async function setFeedback(itemId: string, value: "useful" | "skip" | null) {
  if (!(await ownerEmail())) throw new Error("Unauthorized");
  if (!/^[0-9a-f-]{36}$/.test(itemId) || ![null, "useful", "skip"].includes(value)) throw new Error("Bad request");
  const { error } = await createAdminClient().rpc("set_catchup_feedback", { p_item_id: itemId, p_feedback: value });
  if (error) throw new Error(error.message);
}
