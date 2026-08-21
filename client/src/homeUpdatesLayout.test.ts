import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceDirectory = resolve(import.meta.dirname);
const infoSectionStyles = readFileSync(resolve(sourceDirectory, "gallery-info-sections.css"), "utf8");
const homeSource = readFileSync(resolve(sourceDirectory, "pages", "Home.tsx"), "utf8");

describe("ホームの最近の更新", () => {
  it("デスクトップでも1列の縦リストとして表示する", () => {
    expect(infoSectionStyles).toMatch(/\.gallery-update-list \{\s*display: grid;\s*grid-template-columns: 1fr;/);
    expect(infoSectionStyles).toMatch(/\.gallery-update-link \{[\s\S]*grid-template-columns: minmax\(10rem, 0\.42fr\) minmax\(0, 1fr\);/);
  });

  it("全コンテンツを更新日時の新しい順に統合して表示する", () => {
    expect(homeSource).toContain("buildHomeUpdates([");
    expect(homeSource).toContain("entries.slice(0, 3)");
    expect(homeSource).toContain('<a href={entry.href} className="gallery-update-link">');
  });
});
