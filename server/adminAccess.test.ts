import { describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_COOKIE, createPasswordCredential } from "./adminSession";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({ getAdminCredential: vi.fn(), setAdminCredential: vi.fn(), getAdminLoginAttempt: vi.fn(), recordAdminLoginFailure: vi.fn(), clearAdminLoginAttempt: vi.fn() }));
vi.mock("./db", () => dbMock);
import { appRouter } from "./routers";

function context(isAdmin = false) {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const ctx: TrpcContext = { user: null, isAdmin, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }), clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
  return { ctx, cookies };
}

describe("adminAccess", () => {
  it("管理者ログイン成功時に共有ストア上の失敗記録を削除する", async () => {
    const password = "test-password-for-admin";
    const credential = createPasswordCredential(password);
    dbMock.getAdminCredential.mockResolvedValue({ id: 1, ...credential });
    dbMock.getAdminLoginAttempt.mockResolvedValue(undefined);

    await appRouter.createCaller(context().ctx).adminAccess.login({ password });

    expect(dbMock.clearAdminLoginAttempt).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it("保存済みハッシュと一致する管理者パスワードでHTTP専用の署名付きCookieを発行する", async () => {
    const password = "test-password-for-admin";
    const credential = createPasswordCredential(password);
    dbMock.getAdminCredential.mockResolvedValue({ id: 1, ...credential });
    const { ctx, cookies } = context();

    await expect(appRouter.createCaller(ctx).adminAccess.login({ password })).resolves.toMatchObject({ success: true, sessionToken: expect.stringMatching(/^admin\.\d+\./) });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(ADMIN_SESSION_COOKIE);
    expect(cookies[0]?.value).toMatch(/^admin\.\d+\./);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, sameSite: "none", secure: true, path: "/" });
  });

  it("管理状態はOAuthユーザーの有無ではなく管理セッションだけで判断する", async () => {
    await expect(appRouter.createCaller(context(false).ctx).adminAccess.status()).resolves.toEqual({ isAdmin: false });
    await expect(appRouter.createCaller(context(true).ctx).adminAccess.status()).resolves.toEqual({ isAdmin: true });
  });

  it("有効な管理者セッションだけが12文字以上の新しいパスワードを保存できる", async () => {
    dbMock.setAdminCredential.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context(true).ctx);
    await expect(caller.adminAccess.changePassword({ password: "new-secure-password" })).resolves.toEqual({ success: true });
    expect(dbMock.setAdminCredential).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });
});
