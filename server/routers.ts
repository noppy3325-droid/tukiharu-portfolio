import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, createAdminSession, createPasswordCredential, verifyAdminPassword } from "./adminSession";
import { getSessionCookieOptions } from "./_core/cookies";
import { getAdminCredential, setAdminCredential } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminBlogRouter, blogRouter } from "./routers/blog";
import { adminContentRouter, contentRouter } from "./routers/content";
import { adminLoginKey, canAttemptAdminLogin, clearAdminLoginFailures, recordFailedAdminLogin } from "./adminLoginRateLimit";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  adminAccess: router({
    status: publicProcedure.query(({ ctx }) => ({ isAdmin: Boolean(ctx.isAdmin) })),
    login: publicProcedure.input(z.object({ password: z.string().min(1).max(1024) })).mutation(async ({ ctx, input }) => {
      const loginKey = adminLoginKey(ctx.req.headers, ctx.req.socket?.remoteAddress || "unknown");
      if (!canAttemptAdminLogin(loginKey)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "ログイン試行が多すぎます。しばらくしてから再試行してください。" });
      }
      const credential = await getAdminCredential();
      if (!credential || !verifyAdminPassword(input.password, credential.passwordHash, credential.passwordSalt)) {
        recordFailedAdminLogin(loginKey);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "パスワードが正しくありません。" });
      }
      clearAdminLoginFailures(loginKey);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const sessionToken = createAdminSession();
      ctx.res.cookie(ADMIN_SESSION_COOKIE, sessionToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 12 });
      return { success: true, sessionToken } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: publicProcedure.input(z.object({ password: z.string().min(12, "12文字以上のパスワードを設定してください。").max(1024) })).mutation(async ({ ctx, input }) => {
      if (!ctx.isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "管理者セッションが必要です。" });
      const credential = createPasswordCredential(input.password);
      return setAdminCredential(credential.passwordHash, credential.passwordSalt);
    }),
  }),
  content: contentRouter,
  blog: blogRouter,
  admin: router({
    content: adminContentRouter,
    blog: adminBlogRouter,
  }),
});

export type AppRouter = typeof appRouter;
