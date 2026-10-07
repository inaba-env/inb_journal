import { createAuthClient } from "@/lib/supabase/server";

export type Viewer = { kind: "owner"; email: string } | { kind: "team" } | { kind: "none" };

// Vercel では x-real-ip / x-forwarded-for を Vercel 自身が上書きするので信用できる。
// Vercel 以外に置く場合は、前段のプロキシがこのヘッダーを上書きすることを確認すること。
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

function matches(ip: string, rule: string): boolean {
  const normalized = ip.replace(/^::ffff:/, "");
  if (!rule.includes("/")) return normalized === rule;

  const [base, bitsText] = rule.split("/");
  const bits = Number(bitsText);
  const ipInt = ipv4ToInt(normalized);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null || !(bits >= 0 && bits <= 32)) return false;
  if (bits === 0) return true;
  const shift = 32 - bits;
  return Math.floor(ipInt / 2 ** shift) === Math.floor(baseInt / 2 ** shift);
}

export function isAllowedIp(ip: string | null): boolean {
  if (!ip) return false;
  const rules = (process.env.ALLOWED_IPS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return rules.some((rule) => matches(ip, rule));
}

export async function ownerEmail(): Promise<string | null> {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (typeof email !== "string") return null;
  return email.toLowerCase() === process.env.OWNER_EMAIL?.toLowerCase() ? email : null;
}

// ページ側の最終判定。proxy の判定だけに頼らない。
export async function resolveViewer(headers: Headers): Promise<Viewer> {
  const email = await ownerEmail();
  if (email) return { kind: "owner", email };
  if (isAllowedIp(clientIp(headers))) return { kind: "team" };
  return { kind: "none" };
}
