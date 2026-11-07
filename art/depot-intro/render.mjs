// Run from the repository root with PLAYWRIGHT_MODULE pointing to Playwright.
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const source = "art/depot-intro";
const destination = "client/src/assets/depot-intro";
const portraitSprite = (
  await fs.readFile(path.join(source, "hazuki.png"))
).toString("base64");
const compositions = {
  landscape: {
    width: 1600,
    height: 900,
    screen: [907, 177, 480, 309],
    person: [37, 53, 733, 990],
    desk: [552, 580, 1060, 250],
    window: [1130, 43, 300, 280],
  },
  portrait: {
    width: 900,
    height: 1200,
    screen: [394, 257, 422, 285],
    person: [-18, 402, 562, 759],
    desk: [290, 641, 620, 271],
    window: [501, 65, 283, 290],
  },
};

const palette = `<defs>
  <linearGradient id="wall" x2="1" y2="1"><stop stop-color="#e9f2f3"/><stop offset="1" stop-color="#cbdfe8"/></linearGradient>
  <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#d3eaf3"/></linearGradient>
  <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#f1e5cf"/><stop offset="1" stop-color="#d9c4a6"/></linearGradient>
  <radialGradient id="sun"><stop stop-color="#fffaf0" stop-opacity=".82"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>
</defs>`;
const rect = (x, y, w, h, fill, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;

function drawLayers(layout, sprite) {
  const { width, height } = layout;
  const [sx, sy, sw, sh] = layout.screen;
  const [px, py, pw, ph] = layout.person;
  const [dx, dy, dw, dh] = layout.desk;
  const [wx, wy, ww, wh] = layout.window;
  const floor = height * 0.79;
  const room = `
    ${rect(0, 0, width, height, "url(#wall)")}
    ${rect(0, floor, width, height - floor, "#e9dfd2")}
    ${rect(0, floor - 10, width, 13, "#f4ede4")}
    <ellipse cx="${wx + ww * 0.5}" cy="${wy + wh}" rx="${ww * 1.65}" ry="${wh * 1.5}" fill="url(#sun)"/>
    ${rect(wx - 8, wy - 8, ww + 16, wh + 16, "#fcf7ee", 6)}
    ${rect(wx, wy, ww, wh, "url(#glass)", 3)}
    ${rect(wx + ww / 2 - 3, wy, 6, wh, "#fff9ed")}
    ${rect(wx, wy + wh * 0.48, ww, 6, "#fff9ed")}
    <path d="M${wx} ${wy + wh * 0.9}L${wx + ww * 0.75} ${wy}h36l-${ww * 0.76} ${wh}z" fill="#fff" opacity=".35"/>
    <g transform="translate(${width * 0.08} ${height * 0.23})">
      ${rect(0, 116, 212, 12, "#cdbda9", 3)}
      ${rect(15, 43, 20, 73, "#b8cfd8", 3)}
      ${rect(39, 28, 26, 88, "#e6c6c2", 3)}
      ${rect(70, 50, 19, 66, "#e5d3a9", 3)}
      <path d="M150 83q-24-17-18-57m22 56q15-27 11-51m-13 45q-2-29-12-35" fill="none" stroke="#91acaa" stroke-width="4"/>
      <g fill="#a8c4c0"><ellipse cx="127" cy="29" rx="13" ry="7" transform="rotate(29 127 29)"/><ellipse cx="169" cy="32" rx="14" ry="7" transform="rotate(-22 169 32)"/><ellipse cx="137" cy="47" rx="13" ry="6"/><ellipse cx="162" cy="52" rx="13" ry="6"/></g>
      <path d="M131 80h41l-6 36h-29z" fill="#d9b4a4"/>
    </g>`;
  const desk = `
    <path d="M${dx + 85} ${dy + dh - 43}h23v${height}h-23z M${dx + dw - 85} ${dy + dh - 32}h23v${height}h-23z" fill="#aa9780"/>
    <path d="M${dx} ${dy}h${dw}l54 ${dh - 20}H${dx - 70}z" fill="url(#wood)"/>
    <path d="M${dx - 70} ${dy + dh - 20}h${dw + 124}v20H${dx - 70}z" fill="#c2ac92"/>
    <g transform="translate(${sx + sw * 0.03} ${dy + 65}) skewX(-16)">
      ${rect(0, 0, sw * 0.56, 52, "#3b4147", 8)}
      ${Array.from({ length: 30 }, (_, i) => rect(10 + (i % 10) * sw * 0.051, 8 + Math.floor(i / 10) * 12, sw * 0.038, 8, "#646a6e", 1)).join("")}
    </g>
    <g transform="translate(${Math.min(width - 188, sx + sw * 0.78)} ${dy + 80})">
      ${rect(-13, 49, 180, 19, "#afc6d1", 4)}${rect(4, 34, 160, 17, "#f0dbb5", 3)}
      ${rect(-4, 17, 181, 18, "#e3bbbc", 3)}${rect(3, 0, 153, 18, "#aec4ce", 3)}
      <g transform="translate(14 64)">
        ${rect(1, 5, 98, 59, "#3b4249", 7)}${rect(13, 0, 30, 12, "#535c63", 4)}
        <circle cx="48" cy="36" r="24" fill="#272d33"/><circle cx="48" cy="36" r="15" fill="#536773"/><circle cx="45" cy="33" r="7" fill="#8197a4"/>
        ${rect(73, 14, 14, 8, "#d8dedc", 2)}
      </g>
    </g>`;
  const monitor = `
    <path d="M${sx + sw * 0.46} ${sy + sh}h${sw * 0.08}v${dy - sy - sh + 19}h-${sw * 0.08}z" fill="#3d454d"/>
    ${rect(sx + sw * 0.29, dy + 12, sw * 0.42, 18, "#495158", 7)}
    <path fill="#30373f" fill-rule="evenodd" d="M${sx - 14} ${sy - 14}h${sw + 28}v${sh + 33}H${sx - 14}z M${sx} ${sy}h${sw}v${sh}H${sx}z"/>
    <circle cx="${sx + sw - 12}" cy="${sy + sh + 10}" r="2" fill="#accbd0"/>`;
  return {
    room,
    desk,
    monitor,
    character: `<image href="${sprite}" x="${px}" y="${py}" width="${pw}" height="${ph}"/>`,
  };
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  for (const [variant, layout] of Object.entries(compositions)) {
    const {
      width,
      height,
      screen: [x, y, w, h],
      person: [px, py, pw, ph],
    } = layout;
    const svg = (body, factor) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width * factor}" height="${height * factor}" viewBox="0 0 ${width} ${height}">${palette}${body}</svg>`;
    const layers = drawLayers(layout, "hazuki.png");
    const editable = Object.entries(layers)
      .map(
        ([name, layer]) =>
          (name === "monitor"
            ? `<g id="screen-preview">${rect(x, y, w, h, "#fff7e6")}</g>`
            : "") + `<g id="${name}">${layer}</g>`
      )
      .join("");
    await fs.writeFile(path.join(source, variant + ".svg"), svg(editable, 2));
    const manifest = {
      width: width * 1.6,
      height: height * 1.6,
      screen: {
        x: (x / width) * 100,
        y: (y / height) * 100,
        w: (w / width) * 100,
        h: (h / height) * 100,
      },
      pivot: {
        x: ((px + pw * 0.49) / width) * 100,
        y: Math.min(100, ((py + ph * 0.95) / height) * 100),
      },
    };
    let bytes = 0;
    for (const [name, layer] of Object.entries(layers)) {
      const image = svg(
        layer.replace("hazuki.png", "data:image/png;base64," + portraitSprite),
        1.6
      );
      const encoded = await page.evaluate(async svg => {
        const img = new Image();
        const url = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" })
        );
        try {
          img.src = url;
          await img.decode();
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          return canvas.toDataURL("image/webp", 0.84).split(",")[1];
        } finally {
          URL.revokeObjectURL(url);
        }
      }, image);
      const output = Buffer.from(encoded, "base64");
      manifest[name] = `${variant}-${name}.webp`;
      await fs.writeFile(path.join(destination, manifest[name]), output);
      bytes += output.length;
    }
    if (bytes > (variant === "landscape" ? 900000 : 700000))
      throw new Error(`Asset budget exceeded: ${variant}`);
    await fs.writeFile(
      path.join(destination, variant + ".json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    console.log(
      `${variant}: ${manifest.width}×${manifest.height}, ${bytes} bytes`
    );
  }
} finally {
  await browser.close();
}
