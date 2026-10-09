import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const { privateDir } = JSON.parse(
  fs.readFileSync(".tools/preview.json", "utf8")
);
if (!privateDir.startsWith(path.resolve(".tools") + path.sep))
  throw new Error("Browser QA requires an isolated fixture");
const php = process.env.PHP_BIN || path.resolve(".tools/php/php.exe");
const phpArgs = php.endsWith(".exe")
  ? [
      "-d",
      `extension_dir=${path.dirname(php)}/ext`,
      "-d",
      "extension=pdo_sqlite",
    ]
  : [];
const reset = spawnSync(
  php,
  [
    ...phpArgs,
    "-r",
    "require 'xserver/public/api/bootstrap.php'; sql('DELETE FROM attempts');",
  ],
  {
    env: { ...process.env, PORTFOLIO_PRIVATE_DIR: privateDir },
    encoding: "utf8",
  }
);
if (reset.status !== 0) throw new Error(reset.stderr);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
const base = "http://127.0.0.1:8080";
fs.mkdirSync(".tools/screenshots", { recursive: true });
try {
  await page.goto(base + "/about");
  await page.getByRole("heading", { name: "日々の制作環境" }).waitFor();
  await page
    .getByRole("heading", { name: "ポートフォリオの記録", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".tools/screenshots/about-desktop.png",
    fullPage: true,
  });
  await page.locator(".profile-header").hover({ position: { x: 30, y: 30 } });
  const tilt = await page
    .locator(".profile-header")
    .evaluate(e => ({
      rx: e.style.getPropertyValue("--rx"),
      transform: getComputedStyle(e).transform,
    }));
  assert.notEqual(tilt.rx, "0deg");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".profile-header")
      .evaluate(e => getComputedStyle(e).transform),
    "none"
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/");
    await page.locator(".gallery-home-profile-link").waitFor();
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert(
      dimensions.scroll <= dimensions.client,
      `Horizontal overflow at ${width}`
    );
    const bands = await page
      .locator(".gallery-home-info")
      .evaluate(e => ({
        clip: getComputedStyle(e).clipPath,
        width: e.getBoundingClientRect().width,
        screen: innerWidth,
      }));
    assert.equal(bands.clip, "none");
    assert(bands.width <= width);
  }
  await page.locator(".gallery-home-profile-link").click();
  await page.waitForURL("**/about");
  await page
    .getByRole("button", { name: "メニューを開く", exact: true })
    .click();
  await page
    .locator("#gallery-mobile-navigation")
    .waitFor({ state: "visible" });
  assert.equal(await page.locator(".gallery-menu-close").count(), 1);
  await page.keyboard.press("Escape");
  await page.locator("#gallery-mobile-navigation").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("button", { name: "メニューを開く", exact: true })
      .getAttribute("aria-expanded"),
    "false"
  );
  await page
    .getByRole("button", { name: "メニューを開く", exact: true })
    .focus();
  assert.equal(
    await page
      .getByRole("button", { name: "メニューを開く", exact: true })
      .evaluate(e => getComputedStyle(e).outlineStyle),
    "solid"
  );
  await page.screenshot({
    path: ".tools/screenshots/about-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/admin");
  await page.getByPlaceholder("管理者パスワード").fill("Changed-QA-only-2026!");
  await page
    .getByRole("button", { name: "管理画面を開く", exact: true })
    .click();
  await page.getByRole("heading", { name: "プロフィールを整える" }).waitFor();
  await page
    .getByLabel("肩書き・キャッチコピー")
    .fill("つくる、撮る、日々を残す。");
  await page
    .getByRole("button", { name: "プロフィールを保存", exact: true })
    .click();
  await page
    .getByText("プロフィールを保存しました。", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".tools/screenshots/admin-desktop.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Blog" }).click();
  await page.getByLabel("タイトル", { exact: true }).fill("Browser draft");
  await page
    .getByLabel("URL用スラッグ（半角英数字とハイフン）")
    .fill("browser-draft");
  await page.getByLabel("短い紹介文", { exact: true }).fill("Browser test");
  await page.locator(".rich-editor").fill("日本語入力を確認しています。");
  await page.getByRole("button", { name: "Blogを保存", exact: true }).click();
  await page
    .getByRole("heading", { name: "Browser draft", exact: true })
    .waitFor();
  await page.goto(base + "/works");
  await page.getByRole("link", { name: "作品のPDFを開く ↗" }).waitFor();
  await page.goto(base + "/photos");
  await page.getByRole("button", { name: "テストの写真を拡大表示" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile layouts, no overflow, Home profile navigation, menu and Escape/focus, tilt/reduced motion, admin login/profile save/blog input, Works PDF, gallery viewer."
  );
} finally {
  await browser.close();
}
