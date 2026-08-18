import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  listWorks: vi.fn(), listBooks: vi.fn(), listGalleryItems: vi.fn(), createGalleryItem: vi.fn(),
  listPublishedPosts: vi.fn(), getLikeCount: vi.fn(), addLike: vi.fn(), removeLike: vi.fn(),
  getPublishedPostById: vi.fn(), addComment: vi.fn(), listComments: vi.fn(),
}));

vi.mock("./db", () => dbMock);
import { appRouter } from "./routers";

function context(role: "admin" | "user" | null, isAdmin = false, email = "test@example.com"): TrpcContext {
  return { user: role ? { id: 7, openId: "test-user", name: "Test User", email, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null, isAdmin, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"] };
}

describe("コンテンツと権限のAPI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("公開作品リストはログインなしでも取得できる", async () => {
    dbMock.listWorks.mockResolvedValue([{ id: 1, title: "作品" }]);
    await expect(appRouter.createCaller(context(null)).content.works.list()).resolves.toEqual([{ id: 1, title: "作品" }]);
  });

  it("一般ユーザーはオーナー専用コンテンツAPIを呼び出せない", async () => {
    await expect(appRouter.createCaller(context("user")).admin.content.works.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    expect(dbMock.listWorks).not.toHaveBeenCalled();
  });

  it("OAuthユーザーのロールだけでは不十分で、管理者セッションが必要", async () => {
    await expect(appRouter.createCaller(context("admin")).admin.content.works.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("有効な管理者セッションだけが管理用APIを呼び出せる", async () => {
    dbMock.listWorks.mockResolvedValue([{ id: 1, title: "管理作品" }]);
    await expect(appRouter.createCaller(context(null, true)).admin.content.works.list()).resolves.toEqual([{ id: 1, title: "管理作品" }]);
  });

  it("管理者は写真の撮影詳細を含めてギャラリー項目を保存できる", async () => {
    dbMock.createGalleryItem.mockResolvedValue({ success: true });
    const takenAt = new Date("2026-08-18T09:30:00.000Z");
    const caller = appRouter.createCaller(context(null, true));
    await expect(caller.admin.content.gallery.create({ title: "Morning window", caption: "やわらかな朝の光", imageUrl: "https://example.com/photo.jpg", camera: "Canon EOS R6", lens: "RF 50mm F1.8", location: "Seoul", takenAt, rotation: -2, sortOrder: 1 })).resolves.toEqual({ success: true });
    expect(dbMock.createGalleryItem).toHaveBeenCalledWith(expect.objectContaining({ camera: "Canon EOS R6", lens: "RF 50mm F1.8", location: "Seoul", takenAt }));
  });

  it("匿名のいいねは投稿IDと訪問者キーで記録できる", async () => {
    dbMock.addLike.mockResolvedValue({ liked: true, count: 3 });
    await expect(appRouter.createCaller(context(null)).blog.like({ id: 4, visitorKey: "visitor-key-123" })).resolves.toEqual({ liked: true, count: 3 });
    expect(dbMock.addLike).toHaveBeenCalledWith(4, "visitor-key-123");
  });

  it("コメント投稿は認証済みの訪問者だけに限定される", async () => {
    await expect(appRouter.createCaller(context(null)).blog.addComment({ id: 4, body: "すてきな記事でした" })).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<TRPCError>);
  });
});
