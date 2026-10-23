"use server";

import { ownerEmail } from "@/lib/access";
import type { CatchupFeedback } from "@/lib/catchup";
import { createAdminClient } from "@/lib/supabase/admin";

const VALUES: (CatchupFeedback | null)[] = [null, "interested", "should_know", "out_of_scope"];

// 「関心あり／知っておくべき／範囲外」と一言メモ。本人だけが付けられる。value が null なら反応を取り消す
export async function setFeedback(itemId: string, value: CatchupFeedback | null, note: string) {
  if (!(await ownerEmail())) throw new Error("Unauthorized");
  if (!/^[0-9a-f-]{36}$/.test(itemId) || !VALUES.includes(value) || note.length > 500) throw new Error("Bad request");
  const { error } = await createAdminClient().rpc("set_catchup_feedback", {
    p_item_id: itemId,
    p_feedback: value,
    p_note: note,
  });
  if (error) throw new Error(error.message);
}
