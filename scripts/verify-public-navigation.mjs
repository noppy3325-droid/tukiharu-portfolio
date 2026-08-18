import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const port = 9230;
const profileDir = await mkdtemp(join(tmpdir(), "little-room-public-e2e-"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTarget() {
  for (let count = 0; count < 30; count += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find(target => target.type === "page" && target.url.startsWith(baseUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* Chromium is still starting. */ }
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

const browser = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, `${baseUrl}/`], { stdio: "ignore" });
try {
  const target = await getTarget();
  await wait(1200);
  const result = await evaluate(target.webSocketDebuggerUrl, `
    (async () => {
      const hashTargets = ['works', 'library', 'photos', 'notes'];
      for (const id of hashTargets) {
        const link = document.querySelector('a[href="#' + id + '"]');
        const section = document.getElementById(id);
        if (!link || !section) return { success: false, reason: 'section_link_missing_' + id };
        link.click();
        await new Promise(resolve => setTimeout(resolve, 160));
        if (location.hash !== '#' + id) return { success: false, reason: 'hash_navigation_failed_' + id };
      }
      const notesLink = document.querySelector('a[href="/blog"]');
      if (!notesLink) return { success: false, reason: 'notes_link_missing' };
      notesLink.click();
      await new Promise(resolve => setTimeout(resolve, 700));
      return { success: location.pathname === '/blog' && Boolean(document.querySelector('.simple-blog-hero')), reason: 'notes_navigation_failed' };
    })()
  `);
  if (!result?.success) throw new Error(result?.reason || "public_navigation_failed");
  console.log("public_navigation_verified");
} finally {
  browser.kill("SIGTERM");
  await wait(500);
  try { await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); } catch { /* Temporary browser profile can be left safely. */ }
}
