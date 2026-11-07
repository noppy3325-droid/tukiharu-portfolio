import { afterEach, describe, expect, it, vi } from "vitest";
import { canFadeNavigate } from "./PageTransition";

afterEach(() => vi.unstubAllGlobals());
describe("in-page navigation", () => {
  const event = { button: 0, defaultPrevented: false } as MouseEvent;
  const anchor = {
    target: "",
    hasAttribute: () => false,
  } as unknown as HTMLAnchorElement;
  const from = "https://example.test/blog/a?view=full";
  const check = (target: string) => {
    vi.stubGlobal("window", {
      location: { href: from, origin: new URL(from).origin },
      matchMedia: () => ({ matches: false }),
    });
    return canFadeNavigate(event, anchor, new URL(target, from));
  };
  it("leaves anchors in the current document to native scrolling", () => {
    expect(check("#details")).toBe(false);
    expect(check(from + "#top")).toBe(false);
  });
  it("still fades links to another document or search", () => {
    expect(check("/blog/b#details")).toBe(true);
    expect(check("/blog/a?view=short")).toBe(true);
  });
});
