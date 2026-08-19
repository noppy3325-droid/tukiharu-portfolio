import { describe, expect, it } from "vitest";
import { sanitizeBlogHtml } from "./sanitizeBlogHtml";

describe("sanitizeBlogHtml", () => {
  it("本文の安全な見出し・段落・Gallery画像を保持する", () => {
    const content = '<h2>見出し</h2><p>本文 <strong>強調</strong></p><img src="https://example.com/photo.webp" alt="写真"><img src="/manus-storage/blog/2026-08/photo.webp" alt="本文画像">';
    expect(sanitizeBlogHtml(content)).toContain('<h2>見出し</h2>');
    expect(sanitizeBlogHtml(content)).toContain('<img src="https://example.com/photo.webp" alt="写真" />');
    expect(sanitizeBlogHtml(content)).toContain('<img src="/manus-storage/blog/2026-08/photo.webp" alt="本文画像" />');
  });

  it("スクリプト、イベント属性、危険なURLスキームを除去する", () => {
    const content = '<script>alert(1)</script><p onclick="alert(2)">本文</p><a href="javascript:alert(3)">危険</a><img src="javascript:alert(4)" onerror="alert(5)">';
    const sanitized = sanitizeBlogHtml(content);
    expect(sanitized).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(sanitized).toContain("<p>本文</p>");
  });

  it("危険な要素だけの本文は空の文字列になる", () => {
    expect(sanitizeBlogHtml('<script>alert(1)</script><img src="javascript:alert(2)">')).toBe("");
  });
});
