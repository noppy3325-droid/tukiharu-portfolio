import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const php = process.env.PHP_BIN || "php";
const phpArgs = php.endsWith(".exe")
  ? [
      "-d",
      `extension_dir=${path.dirname(php)}/ext`,
      ...["pdo_sqlite", "sqlite3", "gd", "fileinfo", "mbstring"].flatMap(
        name => ["-d", `extension=${name}`]
      ),
    ]
  : [];
const output = path.resolve(".tools/site-review-verified");
const root = path.join(output, `fixture-${Date.now()}`);
const publicDir = path.join(root, "public");
assert(
  fs.existsSync("dist/public/api/index.php"),
  "Run the full build/package step before PHP browser checks."
);
fs.mkdirSync(root, { recursive: true });
fs.cpSync("dist/public", publicDir, { recursive: true });
const env = {
  ...process.env,
  PORTFOLIO_PRIVATE_DIR: path.join(root, "private"),
};
const run = args => {
  const result = spawnSync(php, [...phpArgs, ...args], {
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
run(["xserver/tests/fixture.php"]);
const fixtureConfig = path.join(root, "private", "config.php");
fs.writeFileSync(fixtureConfig, fs.readFileSync(fixtureConfig, "utf8").replace("http://127.0.0.1:8080", "http://127.0.0.1:8086"));
const image =
  "/assets/" +
  fs
    .readdirSync(path.join(publicDir, "assets"))
    .find(file => /^apple-touch-icon-.*\.png$/.test(file));
const rows = [
  [
    "works",
    {
      title: "余白のある小さな道具",
      summary:
        "制作の背景と使い方を残す。A small project with a longer description for layout verification.",
      category: "Web / Personal",
      url: "https://example.com/",
      thumbnailUrl: image,
      accent: "pink",
      sortOrder: 0,
    },
  ],
  [
    "works",
    {
      title: "写真からつくる記録",
      summary: "静かなアーカイブの検証用作品。",
      category: "Design",
      url: "https://example.org/",
      accent: "mint",
      sortOrder: 1,
    },
  ],
  [
    "gallery",
    {
      title: "日々の光と風景",
      caption: "ゆっくり眺めたい景色。",
      imageUrl: image,
      rotation: 0,
      sortOrder: 0,
    },
  ],
  [
    "posts",
    {
      title: "資材置き場の記録",
      slug: "depot-note",
      excerpt: "日々の小さな気づきを残す。",
      content: "<p>公開表示の検証用記事です。</p>",
      coverColor: "mint",
      status: "published",
      publishedAt: "2026-10-11T00:00:00Z",
    },
  ],
];
rows[3][1].content =
  '<p><a href="#article-end">本文の末尾へ</a></p><p id="article-end">記事の終わりです。</p>';
rows.push([
  "posts",
  {
    title: "次の記事",
    slug: "second-note",
    excerpt: "別の記事の状態",
    content: "<p>二つ目の記事です。</p>",
    status: "published",
    publishedAt: "2026-10-12T00:00:00Z",
  },
]);
const payload = Buffer.from(JSON.stringify(rows)).toString("base64");
run([
  "-r",
  `require 'xserver/public/api/bootstrap.php';foreach(json_decode(base64_decode('${payload}'),true) as [$kind,$p]){$p['createdAt']=now();$p['updatedAt']=now();sql('INSERT INTO records(kind,payload) VALUES(?,?)',[$kind,json_encode($p)]);}saveSetting('profile',array_replace(defaultProfile(),['about'=>'写真や制作を楽しんでいます。','policy'=>'小さな記録を丁寧に残します。','githubUrl'=>'https://github.com/noppy3325-droid','xUrl'=>'https://x.com/honoruru37','devices'=>[['category'=>'camera','name'=>'撮影機材','imageUrl'=>'${image}','note'=>'写真の上に重ならない説明文。']],'_musicLibraryInitialized'=>true]));`,
]);
const base = "http://127.0.0.1:8086";
const server = spawn(
  php,
  [...phpArgs, "-S", "127.0.0.1:8086", "-t", publicDir, "xserver/router.php"],
  { env, stdio: ["ignore", "ignore", "pipe"] }
);
let logs = "";
server.stderr.on("data", chunk => (logs += chunk));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "ja-JP",
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  for (let n = 0; n < 40; n++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const [route, title] of [
    ["/works", "Works"],
    ["/photos", "Gallery"],
    ["/blog", "Blog"],
    ["/flux", "Flux — いまの色"],
    ["/visitor", "コメントに使う名前"],
    ["/blog/depot-note", "資材置き場の記録"],
    ["/missing-page", "404"],
  ]) {
    await page.goto(base + route, { referer: base });
    await page.locator("h1").waitFor();
    await page.waitForFunction(text => document.title.includes(text), title);
  }
  await page.goto(base + "/blog/depot-note", { referer: base });
  await page
    .getByRole("heading", { name: "資材置き場の記録", exact: true })
    .waitFor();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("link", { name: "本文の末尾へ", exact: true }).click();
  await page.waitForURL(base + "/blog/depot-note#article-end");
  assert.equal(
    await page
      .locator("html")
      .evaluate(el => el.classList.contains("page-is-leaving")),
    false
  );
  assert.equal(
    await page.locator("main").evaluate(el => getComputedStyle(el).opacity),
    "1"
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Register a visitor in this isolated fixture, then check article-owned state.
  await page.evaluate(async () => {
    const response = await fetch("/api/trpc/visitor.start", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Portfolio-Request": "1",
      },
      body: JSON.stringify({ json: { name: "検証用の訪問者" } }),
    });
    const result = await response.json();
    if (!response.ok || result.error) throw new Error("fixture visitor registration failed: " + JSON.stringify(result));
  });
  await page.reload();
  const draft = page.getByRole("textbox", {
    name: "コメントを書く",
    exact: true,
  });
  await draft.fill("別の記事へ持ち越さない下書き");
  await page.getByRole("button", { name: /^いいね/ }).click();
  await page.getByRole("button", { name: /いいね、ありがとう/ }).waitFor();
  // Exercise SPA navigation, so the test cannot pass merely because of reload.
  await page.evaluate(() => history.pushState({}, "", "/blog/second-note"));
  await page.getByRole("heading", { name: "次の記事", exact: true }).waitFor();
  assert.equal(await draft.inputValue(), "");
  assert.equal(
    await page.locator(".simple-reactions button.is-liked").count(),
    0
  );
  assert.match(await page.title(), /^次の記事/);
  // Storage failures must not reach the React error boundary or break likes.
  const blockedContext = await browser.newContext({
    reducedMotion: "reduce",
    locale: "ja-JP",
  });
  await blockedContext.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
  });
  const blocked = await blockedContext.newPage();
  blocked.on("pageerror", error => errors.push(error.message));
  await blocked.goto(base + "/blog/depot-note", { referer: base });
  await blocked
    .getByRole("heading", { name: "資材置き場の記録", exact: true })
    .waitFor();
  await blocked.getByRole("button", { name: /^いいね/ }).click();
  await blocked.getByRole("button", { name: /いいね、ありがとう/ }).waitFor();
  await blocked.screenshot({
    path: path.join(output, "blocked-storage-article.png"),
  });
  await blockedContext.close();
  assert.deepEqual(errors, []);
  assert(!/PHP (?:Warning|Deprecated|Fatal error)/.test(logs), logs);
  console.log(
    "PASS: public page titles, native in-page links without fading, SPA article-state reset, blocked storage + non-HTTPS crypto fallback, anonymous likes, labeled comment input; no browser/PHP errors."
  );
} finally {
  fs.writeFileSync(path.join(output, "server.log"), logs);
  await browser.close();
  server.kill();
}
