import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = resolve(import.meta.dirname, "..", "..");
const indexHtml = readFileSync(resolve(clientRoot, "index.html"), "utf8");
const homeSource = readFileSync(resolve(import.meta.dirname, "Home.tsx"), "utf8");

function findContent(name: string) {
  const expression = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]+)"\\s*/?>`);
  return indexHtml.match(expression)?.[1] ?? "";
}

describe("トップページSEOメタ情報", () => {
  it("タイトルを30〜60文字に保ち、Home表示時にdocument.titleへ設定する", () => {
    const title = indexHtml.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(homeSource).toContain("document.title = HOME_SEO_TITLE");
    expect(homeSource.match(/HOME_SEO_TITLE\s*=\s*"([^"]+)"/)?.[1]).toBe(title);
  });

  it("説明文を50〜160文字、関連キーワードを3〜8件に保つ", () => {
    const description = findContent("description");
    const keywords = findContent("keywords").split(",").map(value => value.trim()).filter(Boolean);
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(keywords).toHaveLength(6);
    expect(keywords.length).toBeGreaterThanOrEqual(3);
    expect(keywords.length).toBeLessThanOrEqual(8);
  });
});
