import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { preview } from "vite";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const buildDir = path.resolve("dist/public");
const output = path.resolve(".tools/depot-intro-verified");
await fs.mkdir(output, { recursive: true });
const server = await preview({
  build: { outDir: buildDir },
  preview: { port: 8083, strictPort: true, proxy: {} },
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://127.0.0.1:8083";
async function scenario(options, run) {
  const context = await browser.newContext({ locale: "ja-JP", ...options });
  try {
    await context.route("**/api/**", r =>
      r.fulfill({ status: 503, body: "{}" })
    );
    const page = await context.newPage();
    await run(page);
  } finally {
    await context.close();
  }
}
const intro = page => page.locator(".depot-intro");
const begin = async (page, pathname = "/", options) => {
  await page.goto(base + pathname, options);
  await intro(page).waitFor();
};
try {
  await scenario({ viewport: { width: 1440, height: 900 } }, async page => {
    await begin(page, "/blog", { referer: "https://example.com/" });
    assert.equal(await page.locator(".depot-intro button").count(), 0);
    await page.waitForTimeout(420);
    await page.screenshot({ path: path.join(output, "landscape.png") });
    await page.mouse.click(700, 400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    assert.equal(await intro(page).count(), 1, "click and key must not skip");
    await intro(page).waitFor({ state: "detached" });
    await page.reload();
    await page.locator("h1").waitFor();
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0);
    await page.locator('a[href="/about"]').first().click();
    await page.waitForURL(base + "/about");
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0, "internal SPA navigation must not replay");
    await page.goBack();
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0, "internal history must not replay");
    await begin(page, "/works", { referer: "https://example.com/again" });
    await intro(page).waitFor({ state: "detached" });
    await page.goto(base + "/photos", { referer: base + "/works" });
    await page.waitForTimeout(1500);
    assert.equal(await intro(page).count(), 0, "same-origin document navigation must not replay");
  });
  await scenario(
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    async page => {
      await begin(page, "/about");
      assert.equal(
        await page
          .locator(".depot-intro-monitor-light")
          .evaluate(e => e.style.left),
        ((394 / 900) * 100).toFixed(4).replace(/0+$/, "") + "%"
      );
      await page.waitForTimeout(420);
      await page.screenshot({ path: path.join(output, "portrait.png") });
      await page.touchscreen.tap(200, 400);
      await page.waitForTimeout(300);
      assert.equal(await intro(page).count(), 1, "touch must not skip");
      await intro(page).waitFor({ state: "detached" });
    }
  );
  await scenario({}, async page => {
    await begin(page);
    await page.evaluate(() => history.pushState({}, "", "/works"));
    await intro(page).waitFor({ state: "detached", timeout: 1000 });
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0, "route change must end the entry animation");
  });
  for (const [width, pathname] of [
    [320, "/"],
    [375, "/photos"],
    [430, "/blog/example"],
    [768, "/works"],
    [1024, "/visitor"],
    [1440, "/about"],
  ]) {
    await scenario({ viewport: { width, height: 900 } }, async page => {
      // Old tabs may still carry this obsolete flag. It must not suppress entry.
      await page.addInitScript(() => sessionStorage.setItem("tsukiharu-depot-intro", "1"));
      await begin(page, pathname, { referer: "https://example.com/" });
      assert.equal(await page.locator(".depot-intro button").count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px entry must not overflow`);
    });
  }
  await scenario({ reducedMotion: "reduce" }, async page => {
    await page.goto(base);
    await page.locator("h1").waitFor();
    assert.equal(await intro(page).count(), 0);
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("tsukiharu-depot-intro")
      ),
      null
    );
  });
  await scenario({}, async page => {
    await page.route("**/assets/*-room-*.webp", async route => {
      await new Promise(resolve => setTimeout(resolve, 1600));
      await route.continue();
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator("h1").waitFor();
    await page.waitForTimeout(1900);
    assert.equal(await intro(page).count(), 0);
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("tsukiharu-depot-intro")
      ),
      null
    );
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await scenario({ viewport }, async page => {
      await begin(page);
      await page.waitForFunction(() => {
        const screen = document.querySelector(".depot-intro-monitor-light");
        if (!screen) return false;
        const bounds = screen.getBoundingClientRect();
        return bounds.left <= 0 && bounds.top <= 0 && bounds.right >= innerWidth && bounds.bottom >= innerHeight;
      }, undefined, { timeout: 3200 });
      await intro(page).waitFor({ state: "detached" });
    });
  }
  console.log(
    "PASS: external/direct entry on multiple routes, internal navigation/reload/history suppression, no mouse/touch/keyboard skip, reduced motion, 1200ms fallback, and desktop/portrait zoom coverage."
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
