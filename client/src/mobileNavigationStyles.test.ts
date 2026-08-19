import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceDirectory = resolve(import.meta.dirname);
const mobileStyles = readFileSync(resolve(sourceDirectory, "mobile-navigation-fix.css"), "utf8");
const globalStyles = readFileSync(resolve(sourceDirectory, "index.css"), "utf8");

describe("mobile Blog navigation safeguards", () => {
  it("keeps mobile navigation above page content and enables direct touch manipulation", () => {
    expect(mobileStyles).toContain("z-index: 10000");
    expect(mobileStyles).toContain("z-index: 10001");
    expect(mobileStyles).toContain("z-index: 10011");
    expect(mobileStyles).toContain("touch-action: manipulation");
    expect(mobileStyles).toContain("cursor: pointer");
  });

  it("keeps the mobile owner menu sheet above its dimming overlay", () => {
    expect(mobileStyles).toContain('[data-slot="sheet-content"].admin-section-sheet');
    expect(mobileStyles).toMatch(/admin-section-sheet \{\s*z-index: 10011 !important;/);
    expect(mobileStyles).toContain(".admin-section-sheet .admin-section-list button");
  });

  it("prevents decorative layers and leaving pages from receiving touch events", () => {
    expect(mobileStyles).toMatch(/body::before,[\s\S]*pointer-events: none !important/);
    expect(globalStyles).toContain("html.page-is-leaving .tsuki-page { opacity:0; pointer-events:none;");
  });

  it("does not animate page transforms that create a competing stacking context", () => {
    const pageTransitionStyles = globalStyles.slice(
      globalStyles.indexOf("@media (prefers-reduced-motion: no-preference)"),
      globalStyles.indexOf("@layer components")
    );

    expect(pageTransitionStyles).not.toContain("transform:");
  });
});
