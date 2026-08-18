const password = process.env.ADMIN_CANDIDATE;
if (!password) throw new Error("ADMIN_CANDIDATE が必要です。");

const baseUrl = process.env.ADMIN_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const loginResponse = await fetch(`${baseUrl}/api/trpc/adminAccess.login?batch=1`, {
  method: "POST",
  headers: { "content-type": "application/json", "trpc-accept": "application/json" },
  body: JSON.stringify({ 0: { json: { password } } }),
});
const loginBody = await loginResponse.json();
const sessionToken = loginBody?.[0]?.result?.data?.json?.sessionToken;
if (!loginResponse.ok || typeof sessionToken !== "string") throw new Error("login_failed");

const statusUrl = new URL(`${baseUrl}/api/trpc/adminAccess.status`);
statusUrl.searchParams.set("batch", "1");
statusUrl.searchParams.set("input", JSON.stringify({ 0: { json: null, meta: { values: ["undefined"] } } }));
const statusResponse = await fetch(statusUrl, {
  headers: { "trpc-accept": "application/json", "x-little-room-admin-session": sessionToken },
});
const statusBody = await statusResponse.json();
console.log(statusBody?.[0]?.result?.data?.json?.isAdmin === true ? "header_session_verified" : "header_session_rejected");
