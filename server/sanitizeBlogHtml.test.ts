import { describe, expect, it } from "vitest";
import { sanitizeBlogHtml } from "./sanitizeBlogHtml";

describe("sanitizeBlogHtml", () => {
  it("書式設定の安全な値だけを許可する", () => {
    expect(sanitizeBlogHtml('<p data-font-size="24" data-line-height="1.8" data-text-align="center">本文</p>')).toContain('<p data-font-size="24" data-line-height="1.8" data-text-align="center">');
    const result = sanitizeBlogHtml('<h2 data-font-size="9999" data-line-height="url(javascript:bad)" data-text-align="evil" style="position:fixed">見出し</h2><img src="/uploads/a.webp" data-font-size="24">');
    expect(result).not.toMatch(/data-font-size|data-line-height|data-text-align|style=/);
  });
  it("小見出し・コード・区切り線・取り消し線とリストの開始番号を保存する", () => {
    const html =
      '<h4>小見出し</h4><blockquote><p>引用</p></blockquote><ol start="3"><li><p>三つ目</p></li></ol><p><s>旧文</s> <code>inline</code></p><pre><code class="language-ts">const text = &quot;&lt;script&gt;&quot;;\n  next();</code></pre><hr>';
    const result = sanitizeBlogHtml(html);
    expect(result).toContain("<h4>小見出し</h4>");
    expect(result).toContain('<ol start="3">');
    expect(result).toContain('<code class="language-ts">');
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("\n  next();");
    expect(result).toContain("<hr");
    expect(result).toContain("<s>旧文</s>");
  });
  it("新しいタグでもイベント・任意クラス・不正な開始番号を許可しない", () => {
    const result = sanitizeBlogHtml(
      '<h4 onclick="bad()">見出し</h4><pre style="x"><code class="language-ts evil" onmouseover="bad()">safe</code></pre><ol start="javascript:bad()"><li>x</li></ol><hr onmouseover="bad()">'
    );
    expect(result).not.toMatch(
      /onclick|onmouseover|style=|evil|javascript:|start=/
    );
  });
  it("本文の安全な見出し・段落・Gallery画像を保持する", () => {
    const content =
      '<h2>見出し</h2><p>本文 <strong>強調</strong></p><img src="https://example.com/photo.webp" alt="写真"><img src="/manus-storage/blog/2026-08/photo.webp" alt="本文画像">';
    expect(sanitizeBlogHtml(content)).toContain("<h2>見出し</h2>");
    expect(sanitizeBlogHtml(content)).toContain(
      '<img src="https://example.com/photo.webp" alt="写真" />'
    );
    expect(sanitizeBlogHtml(content)).toContain(
      '<img src="/manus-storage/blog/2026-08/photo.webp" alt="本文画像" />'
    );
  });

  it("スクリプト、イベント属性、危険なURLスキームを除去する", () => {
    const content =
      '<script>alert(1)</script><p onclick="alert(2)">本文</p><a href="javascript:alert(3)">危険</a><img src="javascript:alert(4)" onerror="alert(5)">';
    const sanitized = sanitizeBlogHtml(content);
    expect(sanitized).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(sanitized).toContain("<p>本文</p>");
  });

  it("危険な要素だけの本文は空の文字列になる", () => {
    expect(
      sanitizeBlogHtml(
        '<script>alert(1)</script><img src="javascript:alert(2)">'
      )
    ).toBe("");
  });
});
