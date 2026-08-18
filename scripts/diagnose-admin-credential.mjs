import { scryptSync, timingSafeEqual } from "node:crypto";
import mysql from "mysql2/promise";

const candidate = process.env.ADMIN_CANDIDATE;
if (!candidate || !process.env.DATABASE_URL) {
  throw new Error("診断に必要な環境設定がありません。");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute("SELECT passwordHash, passwordSalt FROM adminCredentials WHERE id = 1");
await connection.end();

const credential = rows[0];
if (!credential) {
  console.log("credential_missing");
  process.exit(0);
}

const candidateHash = scryptSync(candidate, credential.passwordSalt, 64).toString("base64url");
const expected = Buffer.from(credential.passwordHash);
const actual = Buffer.from(candidateHash);
console.log(expected.length === actual.length && timingSafeEqual(expected, actual) ? "credential_matches" : "credential_mismatch");
