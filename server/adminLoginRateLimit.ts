import { createHash } from "node:crypto";
import { clearAdminLoginAttempt, getAdminLoginAttempt, recordAdminLoginFailure } from "./db";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILED_LOGINS = 5;

export function adminLoginKey(headers: Record<string, string | string[] | undefined>, fallback = "unknown") {
  const forwarded = headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || fallback;
}

function hashLoginKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * DBを共有ストアとして使うため、複数インスタンス間でも同じ送信元の失敗回数を参照する。
 * 生のIPアドレスは永続化せず、サーバー側でハッシュ化した値のみ保持する。
 */
export async function canAttemptAdminLogin(key: string, now = Date.now()) {
  const entry = await getAdminLoginAttempt(hashLoginKey(key));
  if (!entry) return true;
  if (now - entry.windowStartedAt.getTime() >= LOGIN_WINDOW_MS) return true;
  return entry.failedAttempts < MAX_FAILED_LOGINS;
}

export async function recordFailedAdminLogin(key: string, now = Date.now()) {
  await recordAdminLoginFailure(hashLoginKey(key), new Date(now), new Date(now - LOGIN_WINDOW_MS));
}

export async function clearAdminLoginFailures(key: string) {
  await clearAdminLoginAttempt(hashLoginKey(key));
}
