import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "client/src/gallery-portfolio.css"), "utf8");

describe("Worksカードのモバイルレイアウト", () => {
  it("紹介文とリンクを縦配置にする", () => {
    expect(styles).toContain(".gallery-shell .tsuki-work-card>div{display:grid");
    expect(styles).toContain(".gallery-shell .tsuki-work-card a.tsuki-work-link{width:fit-content");
  });

  it("モバイルではWorksを1列にして紹介文の横幅を確保する", () => {
    expect(styles).toContain(".gallery-shell .tsuki-work-list{grid-template-columns:minmax(0,1fr);gap:2rem}");
    expect(styles).toContain(".gallery-shell .tsuki-work-card>div p{max-width:34rem;font-size:.82rem;line-height:2");
  });
});
