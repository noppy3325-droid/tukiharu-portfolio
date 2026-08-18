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

export function getAdminSessionToken(
  rawCookieHeader: string | undefined,
  parsedCookies?: Record<string, string | undefined>
) {
  const headerCookies = parse(rawCookieHeader || "");
  return headerCookies[ADMIN_SESSION_COOKIE] || parsedCookies?.[ADMIN_SESSION_COOKIE];
}

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

  // Some hosting adapters expose an empty `req.cookies` object even when the
  // incoming Cookie header is present. Parse the raw header first so a valid
  // administrator session is never hidden by that empty object.
  const adminSessionToken = getAdminSessionToken(
    opts.req.headers.cookie,
    opts.req.cookies as Record<string, string | undefined> | undefined
  );
  return {
    req: opts.req,
    res: opts.res,
    user,
    isAdmin: verifyAdminSession(adminSessionToken),
  };
}
