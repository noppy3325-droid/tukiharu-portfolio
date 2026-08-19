const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const failedAttempts = new Map<string, { count: number; windowStartedAt: number }>();

export function adminLoginKey(headers: Record<string, string | string[] | undefined>, fallback = "unknown") {
  const forwarded = headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || fallback;
}

export function canAttemptAdminLogin(key: string, now = Date.now()) {
  const entry = failedAttempts.get(key);
  if (!entry) return true;
  if (now - entry.windowStartedAt >= LOGIN_WINDOW_MS) {
    failedAttempts.delete(key);
    return true;
  }
  return entry.count < MAX_FAILED_LOGINS;
}

export function recordFailedAdminLogin(key: string, now = Date.now()) {
  const entry = failedAttempts.get(key);
  if (!entry || now - entry.windowStartedAt >= LOGIN_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  failedAttempts.set(key, { ...entry, count: entry.count + 1 });
}

export function clearAdminLoginFailures(key: string) {
  failedAttempts.delete(key);
}

export function resetAdminLoginRateLimitForTest() {
  failedAttempts.clear();
}
