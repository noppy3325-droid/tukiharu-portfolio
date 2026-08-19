import { beforeEach, describe, expect, it } from "vitest";
import { adminLoginKey, canAttemptAdminLogin, clearAdminLoginFailures, recordFailedAdminLogin, resetAdminLoginRateLimitForTest } from "./adminLoginRateLimit";

describe("adminLoginRateLimit", () => {
  beforeEach(() => resetAdminLoginRateLimitForTest());

  it("同一送信元の失敗を5回まで記録し、6回目をブロックする", () => {
    const key = "203.0.113.10";
    for (let count = 0; count < 5; count += 1) recordFailedAdminLogin(key, 1_000);
    expect(canAttemptAdminLogin(key, 1_001)).toBe(false);
  });

  it("制限時間の経過または正しいログインで試行制限を解除する", () => {
    const key = "203.0.113.11";
    for (let count = 0; count < 5; count += 1) recordFailedAdminLogin(key, 1_000);
    expect(canAttemptAdminLogin(key, 1_000 + 15 * 60 * 1000)).toBe(true);
    recordFailedAdminLogin(key, 2_000);
    clearAdminLoginFailures(key);
    expect(canAttemptAdminLogin(key, 2_001)).toBe(true);
  });

  it("転送元IPを優先し、不正な値がない場合はフォールバックを使う", () => {
    expect(adminLoginKey({ "x-forwarded-for": "203.0.113.12, 198.51.100.1" }, "fallback")).toBe("203.0.113.12");
    expect(adminLoginKey({}, "fallback")).toBe("fallback");
  });
});
