import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import postcss from "postcss";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");
const css = read("client/src/depot-motion.css");
const tree = postcss.parse(css);

describe("資材置き場の手続き", () => {
  it("defines the existing timing language", () => {
    expect(css).toContain("--depot-ease:");
    expect(css).toContain("--depot-arrive-ms: 220ms");
  });
  it("ends with the shared reduced-motion reset", () => {
    const last = tree.last;
    expect(last?.type).toBe("atrule");
    expect(last?.toString()).toContain("prefers-reduced-motion: reduce");
    expect(last?.toString()).toContain("animation: none !important");
    expect(last?.toString()).toContain("transition: none !important");
    expect(last?.toString()).toContain("transform: none !important");
    expect(last?.toString()).toContain(".depot-motion *");
  });
  it("imports the layer after the other stylesheet imports", () => {
    const imports = read("client/src/index.css").match(/@import[^;]+;/g) ?? [];
    expect(imports.at(-1)).toBe('@import "./depot-motion.css";');
  });
  it("uses a decorative line icon without a repeated label stamp", () => {
    expect(read("client/src/components/PortfolioHeading.tsx")).toMatch(
      /className="depot-heading-icon"[^>]*aria-hidden="true"/
    );
    expect(read("client/src/components/PortfolioHeading.tsx")).not.toContain('className="depot-stamp');
  });
  it("does not introduce animation, scrolling or rendering dependencies", () => {
    const manifest = JSON.parse(read("package.json"));
    for (const name of [
      "gsap",
      "animejs",
      "lenis",
      "locomotive-scroll",
      "three",
      "@react-three/fiber",
    ]) {
      expect(manifest.dependencies).not.toHaveProperty(name);
      expect(manifest.devDependencies).not.toHaveProperty(name);
    }
  });
  it("animates only compositor-safe properties without moving cards on hover", () => {
    tree.walkAtRules("keyframes", rule => {
      rule.walkDecls(declaration =>
        expect([
          "opacity",
          "transform",
          "box-shadow",
          "background-size",
        ]).toContain(declaration.prop)
      );
    });
    tree.walkRules(rule => {
      if (rule.selector.includes("depot-drawer") && rule.selector.includes(":hover")) {
        rule.walkDecls("transform", () => {
          throw new Error("Card hover must not move the card");
        });
      }
    });
  });
});
