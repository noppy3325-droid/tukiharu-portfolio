import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { ownerProcedure } from "./guards";
import { sanitizeBlogHtml, sanitizeBlogPost } from "../sanitizeBlogHtml";
import { notifyOwner } from "../_core/notification";

const postInput = z.object({
  title: z.string().min(1).max(200), slug: z.string().min(1).max(220).regex(/^[a-z0-9-]+$/, "スラッグは半角英数字とハイフンを使用してください。"),
  excerpt: z.string().min(1).max(1000), content: z.string().min(1).max(20000), coverColor: z.string().max(30), status: z.enum(["draft", "published"]),
});
const idInput = z.object({ id: z.number().int().positive() });
const commentInput = idInput.extend({ body: z.string().min(1).max(2000) });
const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;
const COMMENT_UNDO_WINDOW_MS = 10 * 1000;

function sanitizePostContent(content: string) {
  const sanitized = sanitizeBlogHtml(content).trim();
  if (!sanitized) throw new TRPCError({ code: "BAD_REQUEST", message: "本文に安全な文章または画像を入力してください。" });
  return sanitized;
}

export const blogRouter = router({
  list: publicProcedure.query(async () => (await db.listPublishedPosts()).map(sanitizeBlogPost)),
  navigation: publicProcedure.input(idInput).query(({ input }) => db.getAdjacentPublishedPosts(input.id)),
  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
    const post = await db.getPublishedPostBySlug(input.slug);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "記事が見つかりません。" });
    return sanitizeBlogPost(post);
  }),
  comments: publicProcedure.input(idInput).query(({ input }) => db.listComments(input.id)),
  likes: publicProcedure.input(idInput).query(({ input }) => db.getLikeCount(input.id)),
  like: publicProcedure.input(idInput.extend({ visitorKey: z.string().min(8).max(128) })).mutation(({ input }) => db.addLike(input.id, input.visitorKey)),
  unlike: publicProcedure.input(idInput.extend({ visitorKey: z.string().min(8).max(128) })).mutation(({ input }) => db.removeLike(input.id, input.visitorKey)),
  addComment: protectedProcedure.input(commentInput).mutation(async ({ input, ctx }) => {
    const post = await db.getPublishedPostById(input.id);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "公開中の記事が見つかりません。" });
    const body = input.body.trim();
    const result = await db.addComment(input.id, ctx.user.id, body);
    try {
      await notifyOwner({ title: "新しいBlogコメント", content: `記事: ${post.title}\n投稿者: ${ctx.user.name || "ログイン済みユーザー"}\nコメント: ${body.slice(0, 500)}` });
    } catch (error) {
      console.warn("[Blog] Owner notification could not be sent:", error);
    }
    return result;
  }),
  updateComment: protectedProcedure.input(commentInput).mutation(async ({ input, ctx }) => {
    const updated = await db.updateCommentByAuthorWithinWindow(input.id, ctx.user.id, input.body.trim(), new Date(Date.now() - COMMENT_EDIT_WINDOW_MS));
    if (!updated) throw new TRPCError({ code: "FORBIDDEN", message: "コメントは投稿後5分以内に限り編集できます。" });
    return { success: true };
  }),
  removeComment: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const deleted = await db.deleteCommentByAuthor(input.id, ctx.user.id);
    if (!deleted) throw new TRPCError({ code: "FORBIDDEN", message: "自分が投稿したコメントだけを削除できます。" });
    return { success: true, id: input.id, undoExpiresAt: new Date(Date.now() + COMMENT_UNDO_WINDOW_MS) };
  }),
  restoreComment: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const restored = await db.restoreCommentByAuthor(input.id, ctx.user.id, new Date(Date.now() - COMMENT_UNDO_WINDOW_MS));
    if (!restored) throw new TRPCError({ code: "FORBIDDEN", message: "コメントを元に戻せる時間が過ぎたか、権限がありません。" });
    return { success: true };
  }),
});

export const adminBlogRouter = router({
  posts: router({
    list: ownerProcedure.query(async () => (await db.listAllPosts()).map(sanitizeBlogPost)),
    create: ownerProcedure.input(postInput).mutation(({ input }) => db.createPost({ ...input, content: sanitizePostContent(input.content) })),
    update: ownerProcedure.input(idInput.merge(postInput)).mutation(({ input }) => db.updatePost(input.id, { ...input, content: sanitizePostContent(input.content) })),
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deletePost(input.id)),
  }),
  comments: router({
    remove: ownerProcedure.input(idInput).mutation(({ input }) => db.deleteComment(input.id)),
  }),
});
