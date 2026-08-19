import { describe, expect, it } from "vitest";
import { maxImageUploadBytes, validateImageSelection } from "./imageUpload";

describe("管理画面の画像選択", () => {
  it("JPEG・PNG・WebPで上限以内のファイルを受け入れる", () => {
    expect(validateImageSelection({ type: "image/webp", size: maxImageUploadBytes })).toBeNull();
  });

  it("許可されていない形式と容量超過のファイルを拒否する", () => {
    expect(validateImageSelection({ type: "image/gif", size: 1024 })).toContain("JPEG・PNG・WebP");
    expect(validateImageSelection({ type: "image/jpeg", size: maxImageUploadBytes + 1 })).toContain("5MB");
  });
});
