import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";

export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみが操作できます。" });
  }
  return next();
});
