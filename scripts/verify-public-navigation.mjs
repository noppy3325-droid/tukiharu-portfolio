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
      for (let count = 0; count < 12 && !document.querySelector('.gallery-grid'); count += 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      const grid = document.querySelector('.gallery-grid');
      if (!grid) return { success: false, reason: 'gallery_grid_missing' };
      const hasGalleryStructure = document.querySelectorAll('.gallery-card').length > 0 || /作品を読み込んでいます。|公開コンテンツ/.test(grid.textContent || '');
      if (!hasGalleryStructure) return { success: false, reason: 'gallery_contents_missing' };
      if (!document.querySelector('.gallery-home-info') || !document.querySelector('.gallery-updates')) return { success: false, reason: 'home_info_sections_missing' };
      if (!document.querySelector('a[href="mailto:tukiharu1125+portfolio@gmail.com"]')) return { success: false, reason: 'home_contact_missing' };
      const routes = ['/works', '/photos', '/blog', '/about'];
      if (document.title !== '月春の資材置き場') return { success: false, reason: 'title_not_updated' };
      const blogLink = document.querySelector('header a[href="/blog"]');
      if (!blogLink || blogLink.textContent.trim() !== 'Blog') return { success: false, reason: 'blog_label_not_updated' };
      for (const route of routes) {
        const selector = 'header a[href="' + route + '"]';
        const link = document.querySelector(selector);
        if (!link) return { success: false, reason: 'page_link_missing_' + route };
        if (link.tagName !== 'A' || link.onclick !== null) return { success: false, reason: 'native_navigation_missing_' + route };
      }
      const responses = await Promise.all(routes.map(async route => {
        const response = await fetch(route, { credentials: 'same-origin' });
        const markup = await response.text();
        return { route, ok: response.ok, hasRoot: markup.includes('id="root"') };
      }));
      if (responses.some(({ ok, hasRoot }) => !ok || !hasRoot)) return { success: false, reason: 'public_page_response_failed' };
      const blogResponse = responses.find(({ route }) => route === '/blog');
      if (!blogResponse) return { success: false, reason: 'blog_response_missing' };
      const aboutResponse = responses.find(({ route }) => route === '/about');
      if (!aboutResponse) return { success: false, reason: 'about_response_missing' };
      if (document.body.textContent?.includes('Blogを読み込んでいます。')) return { success: false, reason: 'blog_loading_stuck' };
      if (!document.querySelector('a[href="/photos"]') || !document.querySelector('a[href="/about"]')) {
        return { success: false, reason: 'header_escape_links_missing' };
      }
      return { success: true };
    })()
  `);
  if (!result?.success) throw new Error(result?.reason || "public_navigation_failed");
  console.log("public_navigation_verified");
} finally {
  browser.kill("SIGTERM");
  await wait(500);
  try { await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); } catch { /* Temporary browser profile can be left safely. */ }
}
