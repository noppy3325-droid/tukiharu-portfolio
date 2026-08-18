import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const password = process.env.ADMIN_CANDIDATE;
if (!password) throw new Error("ADMIN_CANDIDATE が必要です。");
const baseUrl = process.env.NOTE_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const port = 9231;
const profileDir = await mkdtemp(join(tmpdir(), "little-room-note-e2e-"));
const slug = `navigation-check-${Date.now()}`;
const title = "導線確認用ノート";
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTarget() {
  for (let count = 0; count < 30; count += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find(target => target.type === "page" && target.url.includes("/admin"));
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* Chromium is starting. */ }
    await wait(250);
  }
  throw new Error("Chromium DevTools に接続できません。");
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } })));
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      socket.close();
      if (message.error || message.result?.exceptionDetails) reject(new Error("ブラウザ評価に失敗しました。"));
      else resolve(message.result.result.value);
    });
    socket.addEventListener("error", () => reject(new Error("DevTools WebSocket 接続に失敗しました。")));
  });
}

const browser = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, `${baseUrl}/admin`], { stdio: "ignore" });
let wsUrl;
try {
  const target = await getTarget();
  wsUrl = target.webSocketDebuggerUrl;
  await wait(1200);
  const setupResult = await evaluate(wsUrl, `
    (async () => {
      const input = document.querySelector('input[type="password"]');
      const form = input?.closest('form');
      if (!input || !form) return { success: false, reason: 'login_form_missing' };
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set.call(input, ${JSON.stringify(password)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const token = sessionStorage.getItem('little_room_admin_session');
      if (!document.querySelector('.admin-desk') || !token) return { success: false, reason: 'admin_session_missing' };
      const request = async (path, method, data) => (await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-little-room-admin-session': token, 'trpc-accept': 'application/json' }, body: data ? JSON.stringify(data) : undefined })).json();
      const created = await request('/api/trpc/admin.blog.posts.create?batch=1', 'POST', { 0: { json: { title: ${JSON.stringify(title)}, slug: ${JSON.stringify(slug)}, excerpt: '実ブラウザでの導線検証用です。', content: '<p>検証完了後に削除されます。</p>', coverColor: 'mint', status: 'published' } } });
      if (created?.[0]?.error) return { success: false, reason: 'create_failed' };
      const homeLink = document.querySelector('a.back-link[href="/"]');
      if (!homeLink) return { success: false, reason: 'home_link_missing' };
      homeLink.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      if (location.pathname !== '/') return { success: false, reason: 'home_navigation_failed' };
      document.querySelector('a[href="/blog"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      const noteLink = document.querySelector('a[href="/blog/${slug}"]');
      if (!noteLink) return { success: false, reason: 'note_link_missing' };
      noteLink.click();
      await new Promise(resolve => setTimeout(resolve, 700));
      const resolvedTitle = document.querySelector('.simple-article h1')?.textContent?.trim();
      const lookup = await (await fetch('/api/trpc/blog.bySlug?batch=1&input=' + encodeURIComponent(JSON.stringify({ 0: { json: { slug: ${JSON.stringify(slug)} } } })), { headers: { 'trpc-accept': 'application/json' } })).json();
      return { success: location.pathname === '/blog/${slug}' && resolvedTitle === ${JSON.stringify(title)}, id: lookup?.[0]?.result?.data?.json?.id ?? null, token };
    })()
  `);
  if (!setupResult?.success) throw new Error(setupResult?.reason || "note_detail_navigation_failed");
  await evaluate(wsUrl, `
    (async () => {
      await fetch('/api/trpc/admin.blog.posts.remove?batch=1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-little-room-admin-session': ${JSON.stringify(setupResult.token)}, 'trpc-accept': 'application/json' }, body: JSON.stringify({ 0: { json: { id: ${JSON.stringify(setupResult.id)} } } }) });
      return true;
    })()
  `);
  console.log("note_detail_navigation_verified");
} finally {
  browser.kill("SIGTERM");
  await wait(500);
  try { await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); } catch { /* Temporary profile can be left safely. */ }
}
