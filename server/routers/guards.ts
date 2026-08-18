import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";

export const ownerProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみが操作できます。" });
  }
  return next();
});
