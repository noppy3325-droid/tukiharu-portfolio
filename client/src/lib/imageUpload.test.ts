import { describe, expect, it } from "vitest";
import { calculateImageDimensions, createUploadImageResult, formatImageBytes, imageFilenameForMimeType, imageTitleFromFilename, maxImageSourceBytes, shouldKeepOriginalImage, validateImageSelection } from "./imageUpload";

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

  it("Safariの変換結果に合わせて実際の形式の拡張子を使い、元画像より大きい結果は採用しない", () => {
    expect(imageFilenameForMimeType("JPEG画像 5.jpg", "image/png")).toBe("JPEG画像 5.png");
    expect(imageFilenameForMimeType("photo", "image/webp")).toBe("photo.webp");
    expect(shouldKeepOriginalImage(3.2 * 1024 * 1024, 4.2 * 1024 * 1024)).toBe(true);
    expect(shouldKeepOriginalImage(6 * 1024 * 1024, 4.2 * 1024 * 1024)).toBe(false);
  });

  it("SafariがWebP指定に対してPNGを返した場合、PNGのMIMEタイプと拡張子をサーバーへ渡せる", () => {
    const source = new File(["original-jpeg-data"], "camera.jpg", { type: "image/jpeg" });
    const result = createUploadImageResult({
      source,
      output: new Blob(["png"], { type: "image/png" }),
      originalWidth: 4000,
      originalHeight: 3000,
      targetWidth: 1920,
      targetHeight: 1440,
    });

    expect(result.file.type).toBe("image/png");
    expect(result.file.name).toBe("camera.png");
    expect(result.keptOriginal).toBe(false);
    expect(result.width).toBe(1920);
  });

  it("形式情報が空、または変換結果が元より大きいSafariの出力では5MB以下のJPEG元画像を使う", () => {
    const source = new File(["small-jpeg"], "camera.jpg", { type: "image/jpeg" });
    const emptyTypeResult = createUploadImageResult({
      source,
      output: new Blob(["smaller-but-unknown"], { type: "" }),
      originalWidth: 1668,
      originalHeight: 2420,
      targetWidth: 1323,
      targetHeight: 1920,
    });
    const largerResult = createUploadImageResult({
      source,
      output: new Blob(["a-converted-file-that-is-larger-than-the-source"], { type: "image/webp" }),
      originalWidth: 1668,
      originalHeight: 2420,
      targetWidth: 1323,
      targetHeight: 1920,
    });

    expect(emptyTypeResult.file).toBe(source);
    expect(emptyTypeResult.keptOriginal).toBe(true);
    expect(largerResult.file).toBe(source);
    expect(largerResult.compressedBytes).toBe(source.size);
  });
});
