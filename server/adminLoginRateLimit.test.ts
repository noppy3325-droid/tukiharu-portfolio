import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ getAdminLoginAttempt: vi.fn(), recordAdminLoginFailure: vi.fn(), clearAdminLoginAttempt: vi.fn() }));
vi.mock("./db", () => dbMock);
import { LOGIN_WINDOW_MS, adminLoginKey, canAttemptAdminLogin, clearAdminLoginFailures, recordFailedAdminLogin } from "./adminLoginRateLimit";

describe("adminLoginRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("共有ストアに5回の失敗がある送信元の6回目をブロックする", async () => {
    const key = "203.0.113.10";
    dbMock.getAdminLoginAttempt.mockResolvedValue({ failedAttempts: 5, windowStartedAt: new Date(1_000) });
    await expect(canAttemptAdminLogin(key, 1_001)).resolves.toBe(false);
  });

  it("期限切れの記録は許可し、失敗と成功を共有ストアへ記録する", async () => {
    const key = "203.0.113.11";
    dbMock.getAdminLoginAttempt.mockResolvedValue({ failedAttempts: 5, windowStartedAt: new Date(1_000) });
    await expect(canAttemptAdminLogin(key, 1_000 + LOGIN_WINDOW_MS)).resolves.toBe(true);
    await recordFailedAdminLogin(key, 2_000);
    await clearAdminLoginFailures(key);
    expect(dbMock.recordAdminLoginFailure).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), new Date(2_000), new Date(2_000 - LOGIN_WINDOW_MS));
    expect(dbMock.clearAdminLoginAttempt).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it("転送元IPを優先し、不正な値がない場合はフォールバックを使う", () => {
    expect(adminLoginKey({ "x-forwarded-for": "203.0.113.12, 198.51.100.1" }, "fallback")).toBe("203.0.113.12");
    expect(adminLoginKey({}, "fallback")).toBe("fallback");
  });
});
