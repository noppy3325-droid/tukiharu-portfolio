import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  listWorks: vi.fn(), listBooks: vi.fn(), listGalleryItems: vi.fn(),
  listPublishedPosts: vi.fn(), getLikeCount: vi.fn(), addLike: vi.fn(), removeLike: vi.fn(),
  getPublishedPostById: vi.fn(), addComment: vi.fn(), listComments: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

function context(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role ? {
      id: 7, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "manus", role,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("コンテンツと権限のAPI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("公開作品リストはログインなしでも取得できる", async () => {
    dbMock.listWorks.mockResolvedValue([{ id: 1, title: "作品" }]);
    const caller = appRouter.createCaller(context(null));
    await expect(caller.content.works.list()).resolves.toEqual([{ id: 1, title: "作品" }]);
  });

  it("一般ユーザーはオーナー専用コンテンツAPIを呼び出せない", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.content.works.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    expect(dbMock.listWorks).not.toHaveBeenCalled();
  });

  it("匿名のいいねは投稿IDと訪問者キーで記録できる", async () => {
    dbMock.addLike.mockResolvedValue({ liked: true, count: 3 });
    const caller = appRouter.createCaller(context(null));
    await expect(caller.blog.like({ id: 4, visitorKey: "visitor-key-123" })).resolves.toEqual({ liked: true, count: 3 });
    expect(dbMock.addLike).toHaveBeenCalledWith(4, "visitor-key-123");
  });

  it("コメント投稿は認証済みの訪問者だけに限定される", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.blog.addComment({ id: 4, body: "すてきな記事でした" })).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<TRPCError>);
  });
});
