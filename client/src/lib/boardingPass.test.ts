import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { createQrArtwork, socialIdentity } from "./boardingPass";
import { SITE_PUBLISHED_AT, SITE_PUBLISHED_LABEL, SITE_URL } from "@shared/site";

describe("プロフィール搭乗券", () => {
  it("SVGに描くQRのパスを独立したデコーダーで読むと公開サイトのURLになる", () => {
    const { path, size } = createQrArtwork(SITE_URL);
    const scale = 6;
    const width = size * scale;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    const squares = Array.from(path.matchAll(/M(\d+) (\d+)h1v1h-1z/g));
    for (const square of squares) {
      const x = Number(square[1]); const y = Number(square[2]);
      expect(x).toBeGreaterThanOrEqual(4); expect(x).toBeLessThan(size - 4);
      expect(y).toBeGreaterThanOrEqual(4); expect(y).toBeLessThan(size - 4);
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const offset = ((y * scale + dy) * width + x * scale + dx) * 4;
        pixels[offset] = 22; pixels[offset + 1] = 60; pixels[offset + 2] = 75;
      }
    }
    expect(jsQR(pixels, width, width)?.data).toBe(SITE_URL);
  });
  it("プロフィールに保存されたSNS URLからIDと安全なリンクを取り出す", () => {
    expect(socialIdentity("https://github.com/noppy3325-droid?tab=repositories", "github")).toEqual({ label: "@noppy3325-droid", url: "https://github.com/noppy3325-droid" });
    expect(socialIdentity("https://twitter.com/tsukiharu_test/status/123", "x")).toEqual({ label: "@tsukiharu_test", url: "https://x.com/tsukiharu_test" });
    for (const value of ["", "javascript:alert(1)", "https://evil.example/name", "https://user:password@x.com/name", "https://x.com/intent/tweet", "https://x.com/"]) expect(socialIdentity(value, "x")).toBeNull();
  });
  it("公開日には指定された2026年10月11日を使用する", () => {
    expect(SITE_PUBLISHED_AT).toBe("2026-10-11");
    expect(SITE_PUBLISHED_LABEL).toBe("2026.10.11");
  });
});
