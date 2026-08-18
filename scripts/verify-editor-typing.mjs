import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://127.0.0.1:3000";
const port = 9232;
const profileDir = await mkdtemp(join(tmpdir(), "tsuki-typing-e2e-"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
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
  const result = await evaluate(target.webSocketDebuggerUrl, `
    (async () => {
      const getLength = () => document.querySelector('.tsuki-code-widget code')?.textContent?.replace(/\\s/g, '').length ?? 0;
      const samples = [];
      for (let index = 0; index < 20; index += 1) {
        samples.push(getLength());
        await new Promise(resolve => setTimeout(resolve, 320));
      }
      return { success: Math.max(...samples) > 0 && new Set(samples).size > 1, samples };
    })()
  `);
  if (!result?.success) throw new Error(`typing_not_progressing_${result?.samples?.join("_")}`);
  console.log("editor_typing_verified");
} finally {
  browser.kill("SIGTERM");
  await wait(500);
  try { await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); } catch { /* Temporary browser profile can be left safely. */ }
}
