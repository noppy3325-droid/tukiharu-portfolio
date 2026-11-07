import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { preview } from "vite";
import {
  FLUX_PALETTES,
  getFluxSelection,
} from "../client/src/lib/fluxPalettes.ts";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const output = path.resolve(".tools/flux-verified");
await fs.mkdir(output, { recursive: true });
const server = await preview({
  build: { outDir: path.resolve("dist/public") },
  preview: { port: 8084, strictPort: true, proxy: {} },
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://127.0.0.1:8084";
const errors = [];
const report = { layouts: [], colors: [], transitions: [] };

async function scenario(options, run) {
  const context = await browser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    ...options,
  });
  let apiCalls = 0;
  await context.route("**/api/**", route => {
    apiCalls++;
    return route.fulfill({ status: 503, body: "{}" });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  try {
    await run(page, () => apiCalls);
  } finally {
    await context.close();
  }
}
async function open(page, date = "2026-11-07T12:34:59+09:00") {
  // Let React's lazy route render before pausing timers; then align the clock.
  await page.clock.install({
    time: new Date(new Date(date).getTime() - 30000),
  });
  await page.goto(base + "/flux", { referer: base + "/about" });
  await page
    .getByRole("heading", { name: "Flux — いまの色", exact: true })
    .waitFor();
  await page.clock.pauseAt(new Date(date));
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.title(), "Flux — いまの色");
  assert.equal(await page.locator(".depot-intro").count(), 0);
}
async function bounds(page) {
  const result = await page.evaluate(() => {
    const width = innerWidth;
    const checked = [
      ...document.querySelectorAll(
        ".flux-masthead, .flux-clock, .flux-calendar, .flux-color-name, .flux-color-details, .flux-line, .flux-vertical, .flux-calendar-note, .gallery-header a, .portfolio-language, .gallery-mobile-menu"
      ),
    ]
      .filter(element => getComputedStyle(element).display !== "none")
      .map(element => {
        const box = element.getBoundingClientRect();
        return {
          name: element.className,
          left: box.left,
          right: box.right,
          scroll: element.scrollWidth,
          client: element.clientWidth,
        };
      });
    return {
      viewport: width,
      height: innerHeight,
      width: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      checked,
    };
  });
  assert.ok(result.width <= result.viewport, JSON.stringify(result));
  for (const item of result.checked) {
    assert.ok(
      item.left >= -1 && item.right <= result.viewport + 1,
      JSON.stringify(item)
    );
    assert.ok(item.scroll <= item.client + 1, JSON.stringify(item));
  }
  return result;
}
async function sampleOpacity(page, selector, milliseconds) {
  return page.locator(selector).evaluate((element, time) => {
    const animation = element
      .getAnimations()
      .find(item => item.effect?.getTiming().duration < 10000);
    if (animation) {
      animation.pause();
      animation.currentTime = time;
    }
    return {
      opacity: Number(getComputedStyle(element).opacity),
      duration: getComputedStyle(element).animationDuration,
    };
  }, milliseconds);
}

try {
  await scenario({ reducedMotion: "reduce" }, async (page, calls) => {
    await page.goto(base + "/flux", { referer: base });
    await page.locator(".flux-line").waitFor();
    const parts = await page.evaluate(() => {
      const date = new Date();
      return [
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
      ];
    });
    const color = getFluxSelection(
      new Date(parts[0], parts[1], parts[2], parts[3], parts[4])
    );
    assert.equal(await page.locator(".flux-line").innerText(), color.line);
    assert.equal(
      await page.locator(".flux-gradient-set").getAttribute("data-color"),
      color.hex
    );
    assert.equal(calls(), 0);
    await page.screenshot({ path: path.join(output, "actual-date.png") });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1
      ),
      "standard desktop height should fit one screen"
    );
  });
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await scenario(
      { viewport: { width, height: 900 }, reducedMotion: "reduce" },
      async (page, calls) => {
        await open(page);
        const result = await bounds(page);
        assert.ok(
          result.pageHeight <= 901,
          `${width}px should fit one screen: ${result.pageHeight}`
        );
        assert.equal(
          await page
            .getByRole("heading", { name: "銀杏色", exact: true })
            .count(),
          1
        );
        assert.equal(
          (await page.locator(".flux-color-details").innerText()).replace(
            /\s+/g,
            " "
          ),
          "いちょういろ — ICHO — #FFB61E"
        );
        assert.equal(
          await page.locator(".flux-line").innerText(),
          "冬の立つ日、銀杏の黄が低い陽の中でいちばん明るい。"
        );
        assert.match(
          await page.locator(".flux-calendar").innerText(),
          /2026年11月7日 土曜日.*霜月.*立冬/
        );
        assert.equal(
          await page.locator(".flux-clock time").innerText(),
          "12:34"
        );
        assert.equal(calls(), 0, "Flux must not call an API");
        assert.equal(
          await page
            .locator('.gallery-desktop-nav a[aria-current="page"]')
            .innerText(),
          "Flux"
        );
        const visible = await page.locator(".flux-vertical").isVisible();
        assert.equal(visible, width >= 768);
        await page.screenshot({ path: path.join(output, `flux-${width}.png`) });
        report.layouts.push({
          width,
          pageHeight: result.pageHeight,
          pass: true,
        });
      }
    );
  }
  // The longest name needs the same room as shorter names, on the narrowest phone.
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [768, 600],
    [1280, 720],
  ]) {
    await scenario(
      { viewport: { width, height }, reducedMotion: "reduce" },
      async page => {
        await open(page);
        const result = await bounds(page);
        assert.ok(
          result.pageHeight <= height + 1,
          `${width}×${height} should fit one screen: ${result.pageHeight}`
        );
        await page.screenshot({
          path: path.join(output, `flux-${width}x${height}.png`),
        });
        report.layouts.push({
          width,
          height,
          pageHeight: result.pageHeight,
          pass: true,
        });
      }
    );
  }
  await scenario(
    { viewport: { width: 320, height: 720 }, reducedMotion: "reduce" },
    async page => {
      await open(page, "2026-08-23T12:00:00+09:00");
      await page
        .getByRole("heading", { name: "女郎花色", exact: true })
        .waitFor();
      const result = await bounds(page);
      assert.ok(result.pageHeight <= 721);
    }
  );
  await scenario({ viewport: { width: 1440, height: 900 } }, async page => {
    await open(page);
    const timings = await page.evaluate(() => ({
      background: getComputedStyle(
        document.querySelector(".flux-gradient-arrival")
      ).animationDuration,
      letters: [...document.querySelectorAll(".flux-letter")].map(
        el => getComputedStyle(el).animationDelay
      ),
      lineDuration: getComputedStyle(document.querySelector(".flux-line"))
        .animationDuration,
      lineDelay: getComputedStyle(document.querySelector(".flux-line"))
        .animationDelay,
      drifts: [...document.querySelectorAll(".flux-wash")].map(
        el => getComputedStyle(el).animationDuration
      ),
      breath: getComputedStyle(document.querySelector(".flux-breath"))
        .animationDuration,
    }));
    assert.deepEqual(timings, {
      background: "3.2s",
      letters: ["0s", "0.12s", "0.24s"],
      lineDuration: "2s",
      lineDelay: "1.8s",
      drifts: ["60s", "90s", "140s"],
      breath: "12s",
    });
    await page.clock.runFor(1000);
    await page.locator(".flux-clock-next").waitFor();
    assert.equal(await page.locator(".flux-clock-next").innerText(), "12:35");
    assert.equal(
      await page.locator(".flux-clock-previous").innerText(),
      "12:34"
    );
    const sample = await sampleOpacity(page, ".flux-clock-next", 400);
    assert.equal(sample.duration, "0.8s");
    assert.ok(Math.abs(sample.opacity - 0.5) < 0.02);
    await page.clock.runFor(800);
    assert.equal(await page.locator(".flux-clock-previous").count(), 0);
    report.transitions.push("800ms minute crossfade; no seconds or movement");
  });
  await scenario({ viewport: { width: 1440, height: 900 } }, async page => {
    await open(page, "2026-11-06T23:59:59+09:00");
    await page.clock.runFor(1000);
    await page.locator('.flux-copy-next[data-sekki="立冬"]').waitFor();
    assert.equal(
      await page.locator('.flux-copy-previous[data-sekki="霜降"]').count(),
      1
    );
    assert.equal(
      await page.locator(".flux-copy-previous").getAttribute("aria-hidden"),
      "true"
    );
    assert.equal(
      await page.getByRole("heading", { name: "紅葉色", exact: true }).count(),
      0
    );
    assert.equal(
      await page
        .locator(".flux-gradient-previous")
        .evaluate(e => getComputedStyle(e).opacity),
      "1"
    );
    for (const selector of [
      ".flux-gradient-next",
      ".flux-copy-next",
      ".flux-copy-previous",
    ]) {
      const sample = await sampleOpacity(page, selector, 2000);
      assert.equal(sample.duration, "4s");
      assert.ok(Math.abs(sample.opacity - 0.5) < 0.02);
    }
    await page.screenshot({ path: path.join(output, "season-crossfade.png") });
    await page.clock.runFor(4000);
    assert.equal(
      await page
        .locator(".flux-copy-previous, .flux-gradient-previous")
        .count(),
      0
    );
    assert.equal(
      await page.locator(".flux-copy-entry").count(),
      0,
      "finishing a transition must not replay entrance"
    );
    assert.equal(
      await page.locator(".flux-line").innerText(),
      "冬の立つ夜、色を保つ木々に静かな緑が宿る。"
    );
    // An inactive tab resumes with actual current time, not an incremented counter.
    await page.clock.setFixedTime(new Date("2026-11-22T10:00:00+09:00"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.locator('.flux-copy-next[data-sekki="小雪"]').waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".flux-copy-previous").waitFor({ state: "detached" });
    assert.equal(await page.locator(".flux-clock time").innerText(), "10:00");
    report.transitions.push(
      "4s midnight season crossfade; opaque old background; no duplicate announcement; wake-up resync; live reduced-motion"
    );
  });
  await scenario({ reducedMotion: "reduce" }, async page => {
    await open(page, "2026-11-06T23:59:59+09:00");
    const animations = await page
      .locator(".flux *")
      .evaluateAll(elements =>
        elements.map(e => getComputedStyle(e).animationName)
      );
    assert.ok(animations.every(name => name === "none"));
    assert.equal(
      await page
        .locator(".flux-line")
        .evaluate(e => getComputedStyle(e).opacity),
      "1"
    );
    await page.clock.runFor(1000);
    await page.getByRole("heading", { name: "千歳緑", exact: true }).waitFor();
    assert.equal(await page.locator(".flux-clock time").innerText(), "00:00");
    assert.equal(
      await page
        .locator(
          ".flux-copy-previous, .flux-gradient-previous, .flux-clock-previous"
        )
        .count(),
      0
    );
    report.transitions.push(
      "reduced motion is static immediately and still updates at midnight"
    );
  });
  for (const [time, period] of [
    ["04:59:59", "morning"],
    ["09:59:59", "day"],
    ["15:59:59", "evening"],
    ["18:59:59", "night"],
  ]) {
    await scenario({}, async page => {
      await open(page, `2026-11-07T${time}+09:00`);
      await page.clock.runFor(1000);
      await page.locator(`.flux-copy-next[data-period="${period}"]`).waitFor();
      assert.equal(
        await page.locator('.flux-copy-previous[data-sekki="立冬"]').count(),
        1
      );
      const sample = await sampleOpacity(page, ".flux-copy-next", 2000);
      assert.equal(sample.duration, "4s");
      assert.ok(Math.abs(sample.opacity - 0.5) < 0.02);
      await page.clock.runFor(4000);
      assert.equal(await page.locator(".flux-copy-previous").count(), 0);
    });
  }
  await scenario(
    { reducedMotion: "reduce", viewport: { width: 320, height: 568 } },
    async page => {
      await open(page);
      let minimumContrast = Infinity;
      for (const palette of Object.values(FLUX_PALETTES))
        for (const color of Object.values(palette)) {
          const hour = { morning: 6, day: 12, evening: 17, night: 21 }[
            color.period
          ];
          const iso = `2026-${String(color.startMonth).padStart(2, "0")}-${String(color.startDay).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+09:00`;
          await page.clock.setFixedTime(new Date(iso));
          await page.evaluate(() => window.dispatchEvent(new Event("focus")));
          await page
            .locator(
              `.flux-color-copy[data-sekki="${color.sekki}"][data-period="${color.period}"]`
            )
            .waitFor();
          assert.equal(
            await page.locator(".flux-line").innerText(),
            color.line
          );
          assert.equal(
            await page.locator(".flux-gradient-set").getAttribute("data-color"),
            color.hex
          );
          await bounds(page);
          const rgb = color.hex
            .slice(1)
            .match(/../g)
            .map(value => parseInt(value, 16));
          const light = rgb.map(
            (value, i) => value * 0.45 + [255, 250, 241][i] * 0.55
          );
          const luminance = channels =>
            channels
              .map(value => {
                const v = value / 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              })
              .reduce(
                (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
                0
              );
          const contrast =
            (luminance(light) + 0.05) / (luminance([46, 45, 41]) + 0.05);
          assert.ok(contrast >= 4.5, `${color.colorName}: ${contrast}`);
          minimumContrast = Math.min(minimumContrast, contrast);
        }
      report.transitions.push(
        `96 seasonal/time sets at 320px; all 48 colors contrast >= ${minimumContrast.toFixed(2)}`
      );
    }
  );
  for (const [date, hour, name, hex] of [
    ["07-07", "06", "朝顔色", "#5C7DB1"],
    ["09-23", "17", "蘇芳色", "#8E354A"],
    ["12-21", "21", "藍色", "#165E83"],
    ["12-07", "12", "千歳緑", "#47885E"],
  ]) {
    await scenario(
      { reducedMotion: "reduce", viewport: { width: 1024, height: 900 } },
      async page => {
        await open(page, `2026-${date}T${hour}:00:00+09:00`);
        await page.getByRole("heading", { name, exact: true }).waitFor();
        assert.equal(
          await page.locator(".flux-gradient-set").getAttribute("data-color"),
          hex
        );
        const inks = await page
          .locator(".flux-color-name, .flux-line, .flux-clock")
          .evaluateAll(elements =>
            elements.map(e => getComputedStyle(e).color)
          );
        assert.ok(inks.every(ink => ink === "rgb(46, 45, 41)"));
        // Conservative contrast bound: all actual washes are this color or lighter.
        const rgb = hex
          .slice(1)
          .match(/../g)
          .map(value => parseInt(value, 16));
        const paper = [255, 250, 241];
        const light = rgb.map((value, i) => value * 0.45 + paper[i] * 0.55);
        const luminance = channels =>
          channels
            .map(value => {
              const v = value / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
              0
            );
        const contrast =
          (luminance(light) + 0.05) / (luminance([46, 45, 41]) + 0.05);
        assert.ok(contrast >= 4.5, `${name} contrast bound ${contrast}`);
        await page.screenshot({ path: path.join(output, `color-${date}.png`) });
        report.colors.push({ name, hex, minimumContrast: contrast });
      }
    );
  }
  await scenario(
    { reducedMotion: "reduce", viewport: { width: 1440, height: 900 } },
    async page => {
      await page.goto(base + "/works", { referer: base });
      const link = page.locator('.gallery-desktop-nav a[href="/flux"]');
      await link.waitFor();
      for (
        let n = 0;
        n < 16 && !(await link.evaluate(e => e === document.activeElement));
        n++
      )
        await page.keyboard.press("Tab");
      assert.ok(await link.evaluate(e => e === document.activeElement));
      await page.keyboard.press("Enter");
      await page.waitForURL(base + "/flux");
      await page.getByRole("heading", { name: "Flux — いまの色" }).waitFor();
      await page.keyboard.press("Tab");
      assert.ok(
        await page
          .locator(".portfolio-skip-link")
          .evaluate(e => e === document.activeElement)
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "portfolio-content"
      );
    }
  );
  await scenario(
    {
      reducedMotion: "reduce",
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    },
    async page => {
      await page.goto(base + "/about", { referer: base });
      await page
        .getByRole("button", { name: "メニューを開く", exact: true })
        .tap();
      const link = page.getByRole("link", { name: "Flux", exact: true });
      await link.scrollIntoViewIfNeeded();
      await link.tap();
      await page.waitForURL(base + "/flux");
      await page.getByRole("heading", { name: "Flux — いまの色" }).waitFor();
      await page
        .getByRole("button", { name: "メニューを開く", exact: true })
        .tap();
      await page.getByRole("link", { name: "Works", exact: true }).tap();
      await page.waitForURL(base + "/works");
    }
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    "PASS: Flux six widths, longest name, exact seasonal content, no API, minute/midnight crossfades, drift/entrance timing, reduced motion, dark-color contrast, keyboard and touch navigation."
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
