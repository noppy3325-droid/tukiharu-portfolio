import { describe, expect, it } from "vitest";
import { isAllowedContentImageUrl, isHttpsUrl } from "./contentUrl";

describe("contentUrl", () => {
  it("HTTPSと管理S3の画像URLだけを許可する", () => {
    expect(isHttpsUrl("https://example.com/work")).toBe(true);
    expect(isAllowedContentImageUrl("/manus-storage/gallery/photo.webp")).toBe(true);
    expect(isAllowedContentImageUrl("https://example.com/photo.webp")).toBe(true);
  });

  it("危険または保護されていないURLスキームを拒否する", () => {
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("data:text/html,unsafe")).toBe(false);
    expect(isHttpsUrl("http://example.com/work")).toBe(false);
    expect(isAllowedContentImageUrl("//example.com/photo.webp")).toBe(false);
  });
});
