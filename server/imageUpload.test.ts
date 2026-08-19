import { describe, expect, it } from "vitest";
import { createImageStorageKey, decodeAndValidateImage, IMAGE_UPLOAD_MAX_BYTES } from "./imageUpload";

describe("画像アップロードの検証", () => {
  it("PNGの署名・サイズを検証してバイナリへ復元する", () => {
    const base64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString("base64");
    expect(decodeAndValidateImage(base64, "image/png")).toEqual(Buffer.from(base64, "base64"));
  });

  it("不正なデータ、形式偽装、上限超過を拒否する", () => {
    expect(() => decodeAndValidateImage("invalid-base64!", "image/png")).toThrow("画像データの形式");
    expect(() => decodeAndValidateImage(Buffer.from("not-image").toString("base64"), "image/png")).toThrow("一致しません");
    const largePng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(IMAGE_UPLOAD_MAX_BYTES)]).toString("base64");
    expect(() => decodeAndValidateImage(largePng, "image/png")).toThrow("5MB以下");
  });

  it("保存キーを拡張子と安全なファイル名に正規化する", () => {
    expect(createImageStorageKey("窓辺の写真.PNG", "image/png")).toMatch(/^gallery\/\d{4}-\d{2}\/gallery-image\.png$/);
    expect(createImageStorageKey("spring light.jpg", "image/jpeg")).toMatch(/spring-light\.jpg$/);
  });
});
