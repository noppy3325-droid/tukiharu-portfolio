import { describe, expect, it } from "vitest";
import { calculateImageDimensions, formatImageBytes, imageTitleFromFilename, maxImageSourceBytes, validateImageSelection } from "./imageUpload";

describe("管理画面の画像選択", () => {
  it("JPEG・PNG・WebPで元画像上限以内のファイルを受け入れる", () => {
    expect(validateImageSelection({ type: "image/webp", size: maxImageSourceBytes })).toBeNull();
  });

  it("許可されていない形式と容量超過のファイルを拒否する", () => {
    expect(validateImageSelection({ type: "image/gif", size: 1024 })).toContain("JPEG・PNG・WebP");
    expect(validateImageSelection({ type: "image/jpeg", size: maxImageSourceBytes + 1 })).toContain("20MB");
  });

  it("長辺を1920px以内へ収め、容量を分かりやすく表示する", () => {
    expect(calculateImageDimensions(4000, 3000)).toEqual({ width: 1920, height: 1440 });
    expect(calculateImageDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(formatImageBytes(820 * 1024)).toBe("820KB");
    expect(formatImageBytes(1.25 * 1024 * 1024)).toBe("1.3MB");
    expect(imageTitleFromFilename("spring_light-01.webp")).toBe("spring light 01");
  });
});
