import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import type { User } from "../../drizzle/schema";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "../adminSession";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isAdmin?: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const cookies = opts.req.cookies ?? parse(opts.req.headers.cookie || "");
  return {
    req: opts.req,
    res: opts.res,
    user,
    isAdmin: verifyAdminSession(cookies[ADMIN_SESSION_COOKIE]),
  };
}
