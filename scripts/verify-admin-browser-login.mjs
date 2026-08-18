import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const password = process.env.ADMIN_CANDIDATE;
if (!password) throw new Error("ADMIN_CANDIDATE が必要です。");
const baseUrl = process.env.ADMIN_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const port = 9229;
const profileDir = await mkdtemp(join(tmpdir(), "little-room-admin-e2e-"));

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function getTarget() {
  for (let count = 0; count < 30; count += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const targets = await response.json();
      const page = targets.find(target => target.type === "page" && target.url.includes("/admin"));
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

const browser = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, `${baseUrl}/admin`], { stdio: "ignore" });
try {
  const target = await getTarget();
  await wait(1200);
  const candidate = JSON.stringify(password);
  const result = await evaluate(target.webSocketDebuggerUrl, `
    (async () => {
      const input = document.querySelector('input[type="password"]');
      const form = input?.closest('form');
      if (!input || !form) return { success: false, reason: 'login_form_missing' };
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter.call(input, ${candidate});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit();
      await new Promise(resolve => setTimeout(resolve, 1800));
      const desk = document.querySelector('.admin-desk');
      const tabs = document.querySelector('.admin-tabs');
      const initialEditor = document.querySelector('.admin-editor');
      const initialList = document.querySelector('.content-list');
      const isFlatTabs = tabs ? getComputedStyle(tabs).borderRadius === '0px' : false;
      const isFlatPanel = panel => panel && getComputedStyle(panel).borderRadius === '0px' && getComputedStyle(panel).boxShadow === 'none';
      const tabNames = ['作品', '本棚', '写真'];
      const tabResults = [];
      for (const tabName of tabNames) {
        const tab = Array.from(document.querySelectorAll('.admin-tabs button')).find(button => button.textContent?.includes(tabName));
        tab?.click();
        await new Promise(resolve => setTimeout(resolve, 350));
        const editor = document.querySelector('.admin-editor');
        const list = document.querySelector('.content-list');
        tabResults.push(Boolean(editor && list && isFlatPanel(editor) && isFlatPanel(list)));
      }
      const success = Boolean(desk && tabs && initialEditor && initialList && isFlatTabs && isFlatPanel(initialEditor) && isFlatPanel(initialList) && tabResults.every(Boolean));
      return { success, error: document.querySelector('.admin-login-error')?.textContent || null, reason: !desk ? 'admin_desk_missing' : !initialEditor || !initialList ? 'posts_editor_or_list_missing' : !tabResults.every(Boolean) ? 'content_tab_editor_or_list_not_flat' : !isFlatTabs ? 'admin_theme_not_flat' : null };
    })()
  `);
  if (!result?.success) throw new Error(result?.error || result?.reason || "admin_dashboard_not_visible");
  console.log("browser_login_verified");
} finally {
  browser.kill("SIGTERM");
  await wait(500);
  try {
    await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
  } catch {
    // Chromium can retain a profile lock briefly after the verification ends.
    // The profile lives under the system temporary directory and is safe to leave.
  }
}
