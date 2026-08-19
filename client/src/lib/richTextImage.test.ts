import { describe, expect, it } from "vitest";
import { buildInlineBlogImageHtml } from "./richTextImage";

describe("buildInlineBlogImageHtml", () => {
  it("画像説明をalt属性に保存する", () => {
    expect(buildInlineBlogImageHtml("/manus-storage/blog/window.webp", "窓辺のカメラ")).toBe('<img src="/manus-storage/blog/window.webp" alt="窓辺のカメラ" />');
  });

  it("前後の空白を除いた代替テキストを保存する", () => {
    expect(buildInlineBlogImageHtml("/manus-storage/blog/book.webp", "  開いた本  ")).toContain('alt="開いた本"');
  });

  it("属性値に含まれるHTMLとして危険な文字をエスケープする", () => {
    expect(buildInlineBlogImageHtml("/manus-storage/blog/a.webp", '" onerror="alert(1)')).toContain('alt="&quot; onerror=&quot;alert(1)"');
  });
});
