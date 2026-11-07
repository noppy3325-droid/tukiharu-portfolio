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
const output = path.resolve(".tools/depot-motion-verified");
const root = path.join(output, `fixture-${Date.now()}`);
const publicDir = path.join(root, "public");
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
const payload = Buffer.from(JSON.stringify(rows)).toString("base64");
run([
  "-r",
  `require 'xserver/public/api/bootstrap.php';foreach(json_decode(base64_decode('${payload}'),true) as [$kind,$p]){$p['createdAt']=now();$p['updatedAt']=now();sql('INSERT INTO records(kind,payload) VALUES(?,?)',[$kind,json_encode($p)]);}saveSetting('profile',array_replace(defaultProfile(),['about'=>'写真や制作を楽しんでいます。','policy'=>'小さな記録を丁寧に残します。','githubUrl'=>'https://github.com/noppy3325-droid','xUrl'=>'https://x.com/honoruru37','devices'=>[['category'=>'camera','name'=>'撮影機材','imageUrl'=>'${image}','note'=>'写真の上に重ならない説明文。']],'_musicLibraryInitialized'=>true]));`,
]);
const base = "http://127.0.0.1:8082";
const server = spawn(
  php,
  [...phpArgs, "-S", "127.0.0.1:8082", "-t", publicDir, "xserver/router.php"],
  { env, stdio: ["ignore", "ignore", "pipe"] }
);
let logs = "";
server.stderr.on("data", chunk => (logs += chunk));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "ja-JP",
  reducedMotion: "no-preference",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
const report = { layouts: [], timing: {}, lights: [], interaction: [] };
const interactionsOnly = process.argv.includes("--interactions-only");
const reducedOnly = process.argv.includes("--reduced-only");
page.on("pageerror", error => errors.push(error.message));
async function ready(target = page) {
  await target.locator(".depot-footer-index").waitFor();
  await target.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(image => image.decode().catch(() => {}))
    );
    await Promise.all(
      document
        .querySelector("main")
        .getAnimations()
        .map(animation => animation.finished.catch(() => {}))
    );
  });
}
try {
  for (let n = 0; n < 40; n++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  // Read-only reference capture; it never logs in or opens the IP-based ticket.
  if (!interactionsOnly && !reducedOnly) {
    const reference = await context.newPage();
    try {
      await reference.goto("https://tukiharu.xsrv.jp/", { timeout: 20000 });
      await reference.locator(".gallery-header").waitFor();
      await reference.screenshot({
        path: path.join(output, "public-reference.png"),
        fullPage: false,
      });
      report.publicReference = "captured, read only";
    } catch (error) {
      report.publicReference = `unavailable: ${error.message}`;
    }
    await reference.close();
    for (const locale of ["ja", "en"]) {
      await page.goto(base, { referer: base });
      await page
        .getByRole("combobox", { name: "Language / 言語" })
        .selectOption(locale);
      for (const route of ["/", "/works", "/photos", "/blog", "/about"]) {
        await page.goto(base + route, { referer: base });
        await ready();
        for (const width of [320, 375, 430, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const state = await page.evaluate(() => {
            const visible = element =>
              element.checkVisibility() &&
              element.getBoundingClientRect().width > 0;
            const outside = [
              ...document.querySelectorAll(
                "main h1, main h2, main p, .depot-heading-icon, .depot-footer-index"
              ),
            ]
              .filter(visible)
              .filter(element => {
                const box = element.getBoundingClientRect();
                return box.left < -1 || box.right > innerWidth + 1;
              })
              .map(element => element.className);
            const header = document.querySelector(".gallery-header");
            const controls = [
              ...header.querySelectorAll(
                ".gallery-brand,.portfolio-language,.gallery-mobile-menu,.gallery-desktop-nav"
              ),
            ]
              .filter(visible)
              .map(element => element.getBoundingClientRect().toJSON());
            return {
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              outside,
              controls,
            };
          });
          assert.equal(
            state.overflow,
            false,
            `${locale} ${route} ${width}: horizontal overflow`
          );
          assert.deepEqual(
            state.outside,
            [],
            `${locale} ${route} ${width}: clipped headings`
          );
          for (let n = 1; n < state.controls.length; n++)
            assert(
              state.controls[n - 1].right <= state.controls[n].left + 1,
              "header controls overlap"
            );
          if (route === "/") {
            const gap = await page.evaluate(() => {
              const heading = document.querySelector(".depot-home-heading");
              const card = document.querySelector(
                ".gallery-home-grid .gallery-card"
              );
              return (
                card.getBoundingClientRect().top -
                heading.getBoundingClientRect().bottom
              );
            });
            assert(gap >= 20, "archive separator needs breathing room");
          }
          if (route === "/about") {
            const copy = page.locator(".device-panel-with-image .device-copy");
            assert.equal(
              await copy.evaluate(
                element => getComputedStyle(element).backgroundColor
              ),
              "rgb(255, 255, 255)"
            );
            assert.equal(
              await page
                .locator(".device-panel-with-image .device-visual")
                .evaluate(element =>
                  getComputedStyle(
                    element,
                    "::after"
                  ).backgroundImage.startsWith("linear-gradient")
                ),
              true
            );
          }
          report.layouts.push({ locale, route, width, pass: true });
          if (locale === "ja" && [375, 1440].includes(width))
            await page.screenshot({
              path: path.join(
                output,
                `${route.slice(1) || "home"}-${width}.png`
              ),
              fullPage: false,
            });
        }
      }
    }
  } else {
    report.layoutVerification = "Layout checks skipped for this focused run.";
  }
  if (!reducedOnly) {
    await page.goto(base + "/works", { referer: base });
    await ready();
    if (interactionsOnly) {
      await page.reload();
      await ready();
    }
    assert.equal(await page.locator(".depot-stamp").count(), 0);
    assert.equal(
      await page.locator(".depot-heading-icon").getAttribute("aria-hidden"),
      "true"
    );
    assert.equal(
      await page.locator(".depot-perforation").getAttribute("aria-hidden"),
      "true"
    );
    const card = page.locator(".tsuki-work-card").first();
    await page.evaluate(() => {
      window.depotShifts = [];
      new PerformanceObserver(list =>
        window.depotShifts.push(
          ...list
            .getEntries()
            .filter(entry => !entry.hadRecentInput)
            .map(entry => entry.value)
        )
      ).observe({ type: "layout-shift", buffered: false });
    });
    const dimensions = await card.evaluate(element => [
      element.offsetWidth,
      element.offsetHeight,
    ]);
    const restingShadow = await card.evaluate(
      element => getComputedStyle(element).boxShadow
    );
    await card.hover({ position: { x: 30, y: 35 } });
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".tsuki-work-card"))
          .boxShadow !== "none"
    );
    assert.notEqual(
      await card.evaluate(element => getComputedStyle(element).boxShadow),
      restingShadow
    );
    assert.notEqual(
      await card.evaluate(element => element.style.getPropertyValue("--rx")),
      "0deg"
    );
    assert.equal(
      await card.evaluate(element => getComputedStyle(element).transform),
      "none"
    );
    assert.equal(
      await card.evaluate(
        element => getComputedStyle(element, "::after").display
      ),
      "none",
      "copy must not be covered by the glare layer"
    );
    for (const route of ["/works", "/photos"]) {
      const check = await context.newPage();
      await check.goto(base + route, { referer: base });
      await ready(check);
      for (const width of [320, 375, 430, 768, 1024, 1440]) {
        await check.setViewportSize({ width, height: 1000 });
        for (const inset of await check
          .locator(".tsuki-work-card, .tsuki-photo-list > article")
          .evaluateAll(elements =>
            elements.map(element => {
              const style = getComputedStyle(element);
              return [
                parseFloat(style.paddingLeft),
                parseFloat(style.paddingRight),
              ];
            })
          ))
          assert(
            inset.every(value => value >= 14),
            `card needs breathing room: ${route} ${width}`
          );
        assert(
          await check.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          )
        );
      }
      if (route === "/works")
        assert.equal(
          await check
            .locator(".content-image-thumb")
            .first()
            .evaluate(element => getComputedStyle(element).objectFit),
          "contain"
        );
      await check.locator(".depot-drawer").first().hover();
      await check.screenshot({
        path: path.join(output, `${route.slice(1)}-calm-hover.png`),
        fullPage: false,
      });
      await check.close();
    }
    assert.deepEqual(
      await card.evaluate(element => [
        element.offsetWidth,
        element.offsetHeight,
      ]),
      dimensions
    );
    assert.equal(
      await page.evaluate(() => window.depotShifts.reduce((a, b) => a + b, 0)),
      0,
      "hover must not shift layout"
    );
    await page.mouse.move(0, 0);
    const pencil = page.locator(".tsuki-work-link").first();
    await pencil.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await page.waitForFunction(
      () =>
        getComputedStyle(document.activeElement).backgroundSize === "100% 1.5px"
    );
    assert.deepEqual(
      await pencil.evaluate(element => [
        getComputedStyle(element).outlineWidth,
        getComputedStyle(element).outlineOffset,
      ]),
      ["2px", "3px"]
    );
    await page.reload();
    await ready();
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.className),
      "portfolio-skip-link"
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "portfolio-content"
    );
    report.interaction.push(
      "calm shadow, static Works and no glare; padded Works/Gallery; no CLS; keyboard pencil outline; skip link; hidden decorations; quiet line icon"
    );

    const navigationContext = await browser.newContext({
      locale: "ja-JP",
      reducedMotion: "no-preference",
    });
    const navigation = await navigationContext.newPage();
    await navigation.goto(base + "/blog", { referer: base });
    await ready(navigation);
    const next = navigation.waitForURL(base + "/blog/depot-note");
    next.catch(() => {});
    await navigation.evaluate(() => {
      // Sample the outgoing document locally: cross-process assertions can land
      // after the 180ms navigation and accidentally measure the incoming page.
      sessionStorage.removeItem("qa-depot-exit");
      document.addEventListener("click", () => {
        setTimeout(() => {
          const main = document.querySelector("main");
          const style = getComputedStyle(main);
          sessionStorage.setItem("qa-depot-exit", JSON.stringify({
            leaving: document.documentElement.classList.contains("page-is-leaving"),
            opacity: style.opacity,
            duration: style.transitionDuration,
          }));
        }, 40);
      }, { once: true, capture: true });
    });
    await navigation.locator(".simple-blog-row").click({ noWaitAfter: true });
    await next;
    await ready(navigation);
    const exit = await navigation.evaluate(() => JSON.parse(sessionStorage.getItem("qa-depot-exit")));
    assert.equal(exit?.leaving, true);
    report.timing.exit = exit.duration;
    report.timing.exitOpacity = exit.opacity;
    assert.equal(report.timing.exit, "0.18s");
    assert(Number(report.timing.exitOpacity) < 1, "the outgoing document must fade");
    report.timing.arrival = await navigation
      .locator("main")
      .evaluate(element => getComputedStyle(element).animationDuration);
    assert.equal(report.timing.arrival, "0.22s");
    await navigationContext.close();

    // The actual Suspense state is held by delaying its route chunk, not by mocking the UI.
    const loadingContext = await browser.newContext({
      locale: "ja-JP",
      reducedMotion: "no-preference",
    });
    const loading = await loadingContext.newPage();
    let release;
    const gate = new Promise(resolve => (release = resolve));
    await loading.route("**/assets/Works-*.js", async route => {
      await gate;
      await route.continue();
    });
    await loading.goto(base + "/works", { waitUntil: "domcontentloaded", referer: base });
    await loading
      .getByText("ページを準備しています。", { exact: true })
      .waitFor();
    const line = loading.locator(".depot-loading-line");
    assert.equal(await line.getAttribute("aria-hidden"), "true");
    assert.deepEqual(
      await line.evaluate(element => {
        const style = getComputedStyle(element);
        return [style.animationDuration, style.animationIterationCount];
      }),
      ["0.6s", "1"]
    );
    await line.evaluate(element =>
      Promise.all(element.getAnimations().map(animation => animation.finished))
    );
    const settled = await line.evaluate(
      element => getComputedStyle(element).transform
    );
    assert.equal(settled, "matrix(1, 0, 0, 1, 0, 0)");
    assert(
      await line.evaluate(element =>
        element
          .getAnimations()
          .every(animation => animation.playState === "finished")
      )
    );
    await loading.screenshot({ path: path.join(output, "loading.png") });
    release();
    await ready(loading);
    await loadingContext.close();

    for (const [hour, light] of [
      [6, "morning"],
      [10, "morning"],
      [11, "day"],
      [16, "day"],
      [17, "evening"],
      [23, "evening"],
    ]) {
      const clockPage = await context.newPage();
      await clockPage.addInitScript(hour => {
        Date.prototype.getHours = () => hour;
      }, hour);
      await clockPage.goto(base + "/works", { referer: base });
      await ready(clockPage);
      assert.equal(
        await clockPage.locator("main").getAttribute("data-depot-light"),
        light
      );
      await clockPage.close();
    }
    for (const light of ["morning", "day", "evening"]) {
      await page
        .locator("main")
        .evaluate(
          (element, light) => (element.dataset.depotLight = light),
          light
        );
      const contrast = await page.evaluate(() => {
        const main = document.querySelector("main");
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--depot-daylight)";
        main.append(probe);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        const rgb = color => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const base = rgb(getComputedStyle(main).backgroundColor);
        const tint = rgb(getComputedStyle(probe).backgroundColor);
        const ink = rgb(getComputedStyle(document.querySelector("h1")).color);
        const lum = channels =>
          channels
            .map(value => value / 255)
            .map(value =>
              value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4
            )
            .reduce(
              (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
              0
            );
        const ratio = color => (lum(color) + 0.05) / (lum(ink) + 0.05);
        probe.remove();
        return {
          base: ratio(base),
          tinted: ratio(base.map((value, i) => 0.7 * value + 0.3 * tint[i])),
          ink,
          image: getComputedStyle(main).backgroundImage,
        };
      });
      assert(
        contrast.tinted >= contrast.base - 0.01,
        `${light} must not lower text contrast`
      );
      assert.equal((contrast.image.match(/radial-gradient/g) || []).length, 1);
      report.lights.push({ light, ...contrast });
    }
    const touchContext = await browser.newContext({
      locale: "ja-JP",
      hasTouch: true,
      isMobile: true,
      viewport: { width: 375, height: 812 },
    });
    const touch = await touchContext.newPage();
    await touch.goto(base + "/works", { referer: base });
    await ready(touch);
    const touchCard = touch.locator(".tsuki-work-card").first();
    const touchShadow = await touchCard.evaluate(
      element => getComputedStyle(element).boxShadow
    );
    await touchCard.tap();
    assert.equal(
      await touchCard.evaluate(element => getComputedStyle(element).boxShadow),
      touchShadow
    );
    assert.equal(
      await touchCard.evaluate(element => getComputedStyle(element).transform),
      "none"
    );
    await touch
      .getByRole("button", { name: "メニューを開く", exact: true })
      .tap();
    await touch.getByRole("link", { name: "Gallery", exact: true }).tap();
    await touch.locator(".tsuki-gallery-image-trigger").first().tap();
    await touch.getByRole("dialog").waitFor();
    await touch.keyboard.press("Escape");
    await touch.getByRole("dialog").waitFor({ state: "detached" });
    await touchContext.close();
  }
  const reducedContext = await browser.newContext({
    locale: "ja-JP",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  const reduced = await reducedContext.newPage();
  await reduced.goto(base + "/works");
  await ready(reduced);
  const motion = await reduced
    .locator(".depot-motion, main")
    .evaluateAll(elements =>
      elements.map(element => {
        const style = getComputedStyle(element);
        return [style.animationName, style.transitionDuration, style.transform];
      })
    );
  for (const [animation, transition, transform] of motion) {
    assert.equal(animation, "none");
    assert.equal(transition, "0s");
    assert.equal(transform, "none");
  }
  await reduced.locator(".tsuki-work-card").first().hover();
  assert.equal(
    await reduced
      .locator(".tsuki-work-card")
      .first()
      .evaluate(element => getComputedStyle(element).transitionDuration),
    "0s"
  );
  await reduced.goto(base);
  await ready(reduced);
  const immediate = reduced.waitForURL(base + "/works");
  immediate.catch(() => {});
  await reduced.locator('.gallery-card[href="/works"]').first().click();
  await immediate;
  assert.equal(
    await reduced
      .locator("html")
      .evaluate(element => element.classList.contains("page-is-leaving")),
    false
  );
  await reducedContext.close();
  report.interaction.push(
    "reduced motion instant; native navigation unchanged"
  );
  assert.deepEqual(errors, []);
  assert(!/PHP (?:Warning|Deprecated|Fatal error)/.test(logs), logs);
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    reducedOnly
      ? "PASS: reduced motion disables animations/transitions/transforms; hover changes instantly; native navigation never enters a leaving state."
      : `PASS: ${interactionsOnly ? "focused interactions" : "60 page/width/language checks"}; hover + keyboard + touch; arrival/exit timing; line icons; real Suspense; daylight boundaries + contrast; reduced motion; no layout shift.`
  );
} catch (error) {
  console.error(error);
  await page
    .screenshot({ path: path.join(output, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(path.join(output, "server.log"), logs);
  await browser.close();
  server.kill();
}
