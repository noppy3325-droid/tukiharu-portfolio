import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { defaultProfile } from "../shared/profile";

const dbMock = vi.hoisted(() => ({
  listWorks: vi.fn(), listBooks: vi.fn(), listGalleryItems: vi.fn(), createWork: vi.fn(), createBook: vi.fn(), createGalleryItem: vi.fn(),
  getSiteSettings: vi.fn(), setSiteProfile: vi.fn(),
  listPublishedPosts: vi.fn(), getAdjacentPublishedPosts: vi.fn(), getLikeCount: vi.fn(), addLike: vi.fn(), removeLike: vi.fn(),
  getPublishedPostById: vi.fn(), addComment: vi.fn(), listComments: vi.fn(), deleteCommentByAuthor: vi.fn(), restoreCommentByAuthor: vi.fn(), updateCommentByAuthorWithinWindow: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({ storagePut: vi.fn() }));
const notificationMock = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("./db", () => dbMock);
vi.mock("./storage", () => storageMock);
vi.mock("./_core/notification", () => notificationMock);
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

  it("自己紹介は公開取得でき、管理者セッションだけが保存できる", async () => {
    const profile = { ...defaultProfile, introduction: "公開する自己紹介" };
    dbMock.getSiteSettings.mockResolvedValue(profile);
    dbMock.setSiteProfile.mockResolvedValue({ success: true });
    const publicCaller = appRouter.createCaller(context(null));
    await expect(publicCaller.content.profile.get()).resolves.toEqual(profile);
    const updated = { ...profile, introduction: "変更後の自己紹介" };
    await expect(appRouter.createCaller(context("user")).admin.content.profile.update(updated)).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(appRouter.createCaller(context(null, true)).admin.content.profile.update(updated)).resolves.toEqual({ success: true });
    expect(dbMock.setSiteProfile).toHaveBeenCalledWith(updated);
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

  it("S3アップロードで返る相対URLをGallery項目として保存できる", async () => {
    dbMock.createGalleryItem.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context(null, true));
    await expect(caller.admin.content.gallery.create({ title: "S3写真", caption: "S3から配信", imageUrl: "/manus-storage/gallery/2026-08/window.png", camera: "", lens: "", location: "", takenAt: null, rotation: 0, sortOrder: 0 })).resolves.toEqual({ success: true });
    expect(dbMock.createGalleryItem).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "/manus-storage/gallery/2026-08/window.png" }));
  });

  it("管理者はWorksサムネイルとBooks表紙のS3 URLを保存できる", async () => {
    dbMock.createWork.mockResolvedValue({ success: true });
    dbMock.createBook.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context(null, true));
    await expect(caller.admin.content.works.create({ title: "画像付き作品", summary: "説明", category: "Web", url: "", thumbnailUrl: "/manus-storage/works/2026-08/sample.webp", accent: "pink", sortOrder: 0 })).resolves.toEqual({ success: true });
    await expect(caller.admin.content.books.create({ title: "画像付きの本", author: "著者", note: "メモ", coverImageUrl: "/manus-storage/books/2026-08/cover.webp", coverColor: "mint", sortOrder: 0 })).resolves.toEqual({ success: true });
    expect(dbMock.createWork).toHaveBeenCalledWith(expect.objectContaining({ thumbnailUrl: "/manus-storage/works/2026-08/sample.webp" }));
    expect(dbMock.createBook).toHaveBeenCalledWith(expect.objectContaining({ coverImageUrl: "/manus-storage/books/2026-08/cover.webp" }));
  });

  it("有効な管理者セッションだけが検証済みの画像をS3へアップロードできる", async () => {
    const pngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString("base64");
    storageMock.storagePut.mockResolvedValue({ key: "gallery/2026-08/window_a1b2c3d4.png", url: "/manus-storage/gallery/2026-08/window_a1b2c3d4.png" });

    await expect(appRouter.createCaller(context("user")).admin.content.upload.image({ filename: "window.png", mimeType: "image/png", base64: pngBase64 })).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(appRouter.createCaller(context(null, true)).admin.content.upload.image({ filename: "window.png", mimeType: "image/png", base64: pngBase64 })).resolves.toMatchObject({ url: "/manus-storage/gallery/2026-08/window_a1b2c3d4.png" });
    expect(storageMock.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^gallery\/\d{4}-\d{2}\/window\.png$/), expect.any(Buffer), "image/png");
    await expect(appRouter.createCaller(context(null, true)).admin.content.upload.image({ filename: "cover.png", mimeType: "image/png", base64: pngBase64, scope: "books" })).resolves.toMatchObject({ url: "/manus-storage/gallery/2026-08/window_a1b2c3d4.png" });
    expect(storageMock.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^books\/\d{4}-\d{2}\/cover\.png$/), expect.any(Buffer), "image/png");
  });

  it("画像データの形式偽装はS3へ保存しない", async () => {
    const spoofedBase64 = Buffer.from("not-a-real-png").toString("base64");

    await expect(appRouter.createCaller(context(null, true)).admin.content.upload.image({ filename: "spoof.png", mimeType: "image/png", base64: spoofedBase64 })).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);
    expect(storageMock.storagePut).not.toHaveBeenCalled();
  });

  it("匿名のいいねは投稿IDと訪問者キーで記録できる", async () => {
    dbMock.addLike.mockResolvedValue({ liked: true, count: 3 });
    await expect(appRouter.createCaller(context(null)).blog.like({ id: 4, visitorKey: "visitor-key-123" })).resolves.toEqual({ liked: true, count: 3 });
    expect(dbMock.addLike).toHaveBeenCalledWith(4, "visitor-key-123");
  });

  it("公開記事の前後ナビゲーションはログインなしでも取得できる", async () => {
    const navigation = { newer: { id: 8, title: "新しい記事", slug: "newer" }, older: { id: 4, title: "前の記事", slug: "older" } };
    dbMock.getAdjacentPublishedPosts.mockResolvedValue(navigation);
    await expect(appRouter.createCaller(context(null)).blog.navigation({ id: 6 })).resolves.toEqual(navigation);
    expect(dbMock.getAdjacentPublishedPosts).toHaveBeenCalledWith(6);
  });

  it("コメント投稿は認証済みの訪問者だけに限定される", async () => {
    await expect(appRouter.createCaller(context(null)).blog.addComment({ id: 4, body: "すてきな記事でした" })).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<TRPCError>);
  });

  it("コメント投稿時に管理者通知を送る", async () => {
    dbMock.getPublishedPostById.mockResolvedValue({ id: 4, title: "通知対象の記事" });
    dbMock.addComment.mockResolvedValue({ success: true });
    notificationMock.notifyOwner.mockResolvedValue(true);
    await expect(appRouter.createCaller(context("user")).blog.addComment({ id: 4, body: "新しいコメントです" })).resolves.toEqual({ success: true });
    expect(notificationMock.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "新しいBlogコメント", content: expect.stringContaining("通知対象の記事") }));
  });

  it("コメントは投稿者本人だけが削除できる", async () => {
    dbMock.deleteCommentByAuthor.mockResolvedValue(true);
    await expect(appRouter.createCaller(context("user")).blog.removeComment({ id: 11 })).resolves.toMatchObject({ success: true, id: 11, undoExpiresAt: expect.any(Date) });
    expect(dbMock.deleteCommentByAuthor).toHaveBeenCalledWith(11, 7);
  });

  it("他者のコメント削除と未ログインの削除を拒否する", async () => {
    dbMock.deleteCommentByAuthor.mockResolvedValue(false);
    await expect(appRouter.createCaller(context("user")).blog.removeComment({ id: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(appRouter.createCaller(context(null)).blog.removeComment({ id: 12 })).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<TRPCError>);
  });

  it("コメントは投稿後5分以内なら投稿者本人が編集でき、短時間だけ削除を取り消せる", async () => {
    dbMock.updateCommentByAuthorWithinWindow.mockResolvedValue(true);
    dbMock.restoreCommentByAuthor.mockResolvedValue(true);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.blog.updateComment({ id: 13, body: "編集後のコメント" })).resolves.toEqual({ success: true });
    expect(dbMock.updateCommentByAuthorWithinWindow).toHaveBeenCalledWith(13, 7, "編集後のコメント", expect.any(Date));
    await expect(caller.blog.restoreComment({ id: 13 })).resolves.toEqual({ success: true });
    expect(dbMock.restoreCommentByAuthor).toHaveBeenCalledWith(13, 7, expect.any(Date));
  });

  it("編集期限切れまたは他者のコメント復元を拒否する", async () => {
    dbMock.updateCommentByAuthorWithinWindow.mockResolvedValue(false);
    dbMock.restoreCommentByAuthor.mockResolvedValue(false);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.blog.updateComment({ id: 14, body: "期限切れ" })).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(caller.blog.restoreComment({ id: 14 })).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });
});
