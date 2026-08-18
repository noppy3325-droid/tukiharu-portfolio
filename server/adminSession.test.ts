import { describe, expect, it } from "vitest";
import { createAdminSession, createPasswordCredential, verifyAdminPassword, verifyAdminSession } from "./adminSession";

describe("管理者パスワードセッション", () => {
  it("ハッシュ化されたパスワードのみを受け入れ、署名付きの期限内セッションを検証する", () => {
    const credential = createPasswordCredential("correct-horse-battery-staple");
    expect(verifyAdminPassword("correct-horse-battery-staple", credential.passwordHash, credential.passwordSalt)).toBe(true);
    expect(verifyAdminPassword("wrong-password", credential.passwordHash, credential.passwordSalt)).toBe(false);

    const now = 1_700_000_000_000;
    const token = createAdminSession(now);
    expect(verifyAdminSession(token, now + 1_000)).toBe(true);
    expect(verifyAdminSession(`${token}tampered`, now + 1_000)).toBe(false);
    expect(verifyAdminSession(token, now + 1000 * 60 * 60 * 13)).toBe(false);
  });
});
