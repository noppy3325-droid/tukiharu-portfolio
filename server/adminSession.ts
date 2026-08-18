import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "little_room_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

function signingKey() { return process.env.JWT_SECRET || ""; }

export function createPasswordCredential(password: string) {
  const passwordSalt = randomBytes(16).toString("base64url");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("base64url");
  return { passwordSalt, passwordHash };
}

export function verifyAdminPassword(candidate: string, passwordHash: string, passwordSalt: string) {
  if (!candidate || !passwordHash || !passwordSalt) return false;
  const candidateHash = scryptSync(candidate, passwordSalt, 64).toString("base64url");
  const expectedBuffer = Buffer.from(passwordHash);
  const candidateBuffer = Buffer.from(candidateHash);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function createAdminSession(now = Date.now()) {
  const expiresAt = now + SESSION_DURATION_MS;
  const payload = `admin.${expiresAt}`;
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token: string | undefined, now = Date.now()) {
  if (!token || !signingKey()) return false;
  const [scope, expiry, signature] = token.split(".");
  if (scope !== "admin" || !expiry || !signature) return false;
  const payload = `${scope}.${expiry}`;
  const expected = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return false;
  return Number(expiry) > now;
}
