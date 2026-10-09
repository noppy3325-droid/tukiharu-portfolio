import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// Run test:xserver and serve-preview first. Never log in to a real deployment.
const fixture = JSON.parse(fs.readFileSync(".tools/preview.json", "utf8"));
for (const directory of [fixture.privateDir, fixture.publicDir]) {
  assert(
    directory.startsWith(path.resolve(".tools") + path.sep),
    "Isolated QA fixture required"
  );
}
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const base = "http://127.0.0.1:8080";
const widths = [320, 375, 430, 768, 1024, 1440];
const output = path.resolve(".tools/responsive-verified");
fs.mkdirSync(output, { recursive: true });
const page = await browser.newPage();
const errors = [];
const report = [];
page.on("pageerror", error => errors.push(error.message));

async function ready() {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(img => img.decode().catch(() => {}))
    );
    scrollTo(0, document.body.scrollHeight);
    await new Promise(requestAnimationFrame);
    scrollTo(0, 0);
    await new Promise(requestAnimationFrame);
  });
}

async function inspect(name, width, { screenshot = true } = {}) {
  const result = await page.evaluate(() => {
    const visible = e =>
      e.checkVisibility() && e.getBoundingClientRect().width > 0;
    const elements = [
      ...document.querySelectorAll("main *, [role='dialog'] *"),
    ].filter(visible);
    const outside = elements
      .filter(e => {
        if (
          e.closest("svg") ||
          e.classList.contains("sr-only") ||
          getComputedStyle(e).position === "fixed"
        )
          return false;
        const r = e.getBoundingClientRect();
        return r.left < -1 || r.right > innerWidth + 1;
      })
      .map(e => ({
        tag: e.tagName,
        class: e.className,
        text: e.textContent?.slice(0, 60),
      }));
    const textOutside = elements
      .filter(
        e =>
          e.matches("h1,h2,h3,p,time,dd") &&
          !e.closest("svg") &&
          !e.children.length
      )
      .filter(e => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const box = e.getBoundingClientRect();
        return [...range.getClientRects()].some(
          r => r.left < box.left - 2 || r.right > box.right + 2
        );
      })
      .map(e => ({ tag: e.tagName, text: e.textContent?.slice(0, 60) }));
    const header = document.querySelector(".gallery-header");
    const brand = header
      ?.querySelector(".gallery-brand")
      ?.getBoundingClientRect();
    const nav =
      header &&
      [...header.querySelectorAll("nav,button")]
        .filter(visible)[0]
        ?.getBoundingClientRect();
    return {
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
      outside,
      textOutside,
      headerOverlap: Boolean(brand && nav && brand.right > nav.left + 1),
    };
  });
  report.push({ name, width, ...result });
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify({ report, errors }, null, 2)
  );
  if (screenshot)
    await page.screenshot({
      path: path.join(output, `${name}-${width}.png`),
      fullPage: true,
    });
  assert(
    result.scroll <= result.viewport,
    `${name}/${width}: document overflow`
  );
  assert.deepEqual(
    result.outside,
    [],
    `${name}/${width}: elements beyond viewport`
  );
  assert.deepEqual(
    result.textOutside,
    [],
    `${name}/${width}: text beyond its box`
  );
  assert.equal(
    result.headerOverlap,
    false,
    `${name}/${width}: navigation overlaps brand`
  );
}

async function stress(name, width) {
  // Deliberately longer content without writing to the fixture database.
  await page.evaluate(() => {
    const long = "LongUnbrokenTitleOrURL".repeat(10);
    for (const e of document.querySelectorAll(
      ".gallery-card h2,.tsuki-work-card h2,.tsuki-work-card > div p,.tsuki-work-link span,.tsuki-photo-list h2,.tsuki-photo-list p,.profile-header h1,.profile-prose,.profile-tags span,.music-record h3,.activity-timeline h3,.simple-blog-row h2,.simple-article > header h1,.simple-comment-list article p,.content-list h3,.device-copy dd"
    )) {
      e.textContent = `${long} 写真・制作の記録を読みやすく残すための長い文章です。`;
    }
  });
  await inspect(`${name}-long`, width, { screenshot: false });
}

async function mutate(procedure, input) {
  const response = await page.request.post(`${base}/api/trpc/${procedure}`, {
    headers: { "X-Portfolio-Request": "1" },
    data: { json: input },
  });
  const result = await response.json();
  assert(
    response.ok() && !result.error,
    `${procedure}: QA fixture mutation failed`
  );
  return result.result.data.json;
}

try {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const postsResponse = await page.request.get(`${base}/api/trpc/blog.list`);
  assert(postsResponse.ok());
  const posts = (await postsResponse.json()).result.data.json;
  assert(posts.length, "Published article fixture required");
  const routes = [
    "/",
    "/about",
    "/works",
    "/photos",
    "/library",
    "/blog",
    `/blog/${posts[0].slug}`,
    "/visitor",
    "/admin",
    "/404",
  ];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(base + route);
      await ready();
      const name = route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
      await inspect(name, width);
      if (route === "/") {
        const thumbs = await page
          .locator(".gallery-grid .gallery-thumb")
          .evaluateAll(es =>
            es.map(e => {
              const box = e.getBoundingClientRect();
              return Math.abs(box.width - box.height);
            })
          );
        assert(
          thumbs.length && thumbs.every(d => d < 1),
          "Home thumbnails must stay square"
        );
      }
      await stress(name, width);
    }
  }

  await page.goto(base + "/admin");
  await page
    .getByLabel("管理者パスワード", { exact: true })
    .fill("Changed-QA-only-2026!");
  await page
    .getByRole("button", { name: "管理画面を開く", exact: true })
    .click();
  await page.getByRole("heading", { name: "プロフィールを整える" }).waitFor();
  // Cover-image book rows are not present in every integration fixture.
  const bookResponse = await page.request.get(
    `${base}/api/trpc/admin.content.books.list`
  );
  const books = (await bookResponse.json()).result.data.json;
  const bookTitle = "Responsive QA：写真と制作を記録するための長い本のタイトル";
  if (!books.some(book => book.title === bookTitle)) {
    const galleryResponse = await page.request.get(
      `${base}/api/trpc/content.gallery.list`
    );
    const photos = (await galleryResponse.json()).result.data.json;
    assert(photos[0]?.imageUrl, "Photo fixture required");
    await mutate("admin.content.books.create", {
      title: bookTitle,
      author: "長い著者名と共同制作の記録",
      note: "CoverImageLayoutAndLongBookNotes".repeat(8),
      coverImageUrl: photos[0].imageUrl,
      coverColor: "pink",
      sortOrder: 0,
    });
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ["自己紹介", "Blog", "Works", "Books", "Gallery"]) {
      if (await page.locator(".admin-mobile-menu").isVisible()) {
        await page.locator(".admin-mobile-menu").click();
        await page
          .locator(".admin-section-list")
          .getByRole("button", { name: new RegExp(name) })
          .click();
        await page.locator(".admin-section-sheet").waitFor({ state: "hidden" });
      } else {
        await page.getByRole("tab", { name }).click();
      }
      await ready();
      if (await page.locator(".admin-mobile-menu").isVisible()) {
        const appearance = await page
          .locator(".admin-mobile-menu")
          .evaluate(e => {
            const style = getComputedStyle(e);
            return {
              foreground: style.color,
              background: style.backgroundImage,
            };
          });
        assert.equal(appearance.foreground, "rgb(255, 255, 255)");
        assert.notEqual(
          appearance.background,
          "none",
          "Section menu must not have white text on a white hover surface"
        );
      }
      await inspect(`admin-${name}`, width);
      if (name === "Blog") {
        assert.equal(
          await page
            .getByRole("textbox", { name: "本文", exact: true })
            .count(),
          1
        );
      }
    }
    await page.locator(".admin-private-actions summary").click();
    await inspect("admin-password", width);
    await page
      .getByLabel("新しい管理者パスワード")
      .fill("NotSubmitted-QA-Only!");
    await page.locator(".admin-private-actions summary").click();
    await page.getByRole("button", { name: "ログアウト" }).focus();
    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => document.activeElement !== document.body));
  }
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.getByLabel("管理者パスワード", { exact: true }).waitFor();
  await mutate("visitor.start", {
    name: "Responsive QA visitor name with long metadata",
  });
  await mutate("blog.addComment", {
    id: posts[0].id,
    body: "LongCommentWithoutSpaces".repeat(8),
  });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of [
      ["library-cover", "/library"],
      ["article-comment", `/blog/${posts[0].slug}`],
    ]) {
      await page.goto(base + route);
      await ready();
      await inspect(name, width);
      await stress(name, width);
    }
  }

  // Real DOM keyboard/touch events in a Chrome mobile emulation context.
  const touch = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await touch.newPage();
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(base + "/about");
  const menu = mobile.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  await menu.tap();
  const sheet = mobile.locator(".gallery-mobile-sheet");
  await sheet.waitFor({ state: "visible" });
  await mobile.keyboard.press("Tab");
  assert(
    await mobile.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]'))
    ),
    "Focus must remain in the menu"
  );
  await mobile.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  assert(
    await menu.evaluate(e => e === document.activeElement),
    "Escape returns menu focus"
  );
  await menu.tap();
  await mobile
    .locator(".gallery-mobile-nav")
    .getByRole("link", { name: "Works", exact: true })
    .tap();
  await mobile.waitForURL("**/works");
  await mobile.goto(base + "/photos");
  const trigger = mobile.locator(".tsuki-gallery-image-trigger").first();
  await trigger.tap();
  await mobile.getByRole("dialog").waitFor();
  await mobile.locator('[data-slot="dialog-close"]').tap();
  await mobile.getByRole("dialog").waitFor({ state: "hidden" });
  assert(
    await trigger.evaluate(e => e === document.activeElement),
    "Viewer returns trigger focus"
  );
  await touch.close();

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(base + "/about");
  await ready();
  await page.keyboard.press("Tab");
  assert(
    await page
      .locator(".portfolio-skip-link")
      .evaluate(e => e === document.activeElement)
  );
  await page.keyboard.press("Enter");
  assert(
    await page
      .locator("#portfolio-content")
      .evaluate(e => e === document.activeElement)
  );
  await page
    .getByRole("button", { name: "メニューを開く", exact: true })
    .click();
  await inspect("mobile-menu", 320);
  const motion = await page.locator(".gallery-mobile-sheet").evaluate(e => ({
    animation: getComputedStyle(e).animationName,
    transition: getComputedStyle(e).transitionDuration,
  }));
  assert.equal(motion.animation, "none");
  assert.equal(motion.transition, "0s");
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator(".profile-header")
      .evaluate(e => getComputedStyle(e).transform),
    "none"
  );
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${report.length} layout/stress cases at ${widths.join("/")}px; square thumbnails, text containment, admin tabs/password, keyboard focus, skip navigation, touch menu/viewer, reduced motion. Screenshots: ${output}`
  );
} finally {
  await browser.close();
}
