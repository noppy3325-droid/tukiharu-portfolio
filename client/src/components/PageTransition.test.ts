import { afterEach, describe, expect, it, vi } from "vitest";
import { canFadeNavigate } from "./PageTransition";

const anchor = (options: Partial<HTMLAnchorElement> = {}) =>
  ({
    target: "",
    hasAttribute: () => false,
    dataset: {},
    ...options,
  }) as HTMLAnchorElement;

const click = (options: Partial<MouseEvent> = {}) =>
  ({
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...options,
  }) as MouseEvent;

afterEach(() => vi.unstubAllGlobals());

describe("canFadeNavigate", () => {
  it("同一オリジンの通常リンクにはフェードを適用する", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
        href: "https://example.test/blog",
      },
      matchMedia: () => ({ matches: false }),
    });
    expect(
      canFadeNavigate(
        click(),
        anchor(),
        new URL("https://example.test/gallery")
      )
    ).toBe(true);
  });

  it("モーション軽減設定または新しいタブを開く操作には適用しない", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
        href: "https://example.test/blog",
      },
      matchMedia: () => ({ matches: true }),
    });
    expect(
      canFadeNavigate(
        click(),
        anchor(),
        new URL("https://example.test/gallery")
      )
    ).toBe(false);

    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
        href: "https://example.test/blog",
      },
      matchMedia: () => ({ matches: false }),
    });
    expect(
      canFadeNavigate(
        click({ metaKey: true }),
        anchor(),
        new URL("https://example.test/gallery")
      )
    ).toBe(false);
  });

  it("値のないフェード無効属性でも通常のナビゲーションを維持する", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
        href: "https://example.test/about",
      },
      matchMedia: () => ({ matches: false }),
    });
    const noFade = anchor({
      hasAttribute: name => name === "data-page-transition-off",
      dataset: { pageTransitionOff: "" },
    });
    expect(
      canFadeNavigate(
        click(),
        noFade,
        new URL("https://example.test/about#skills")
      )
    ).toBe(false);
    expect(
      canFadeNavigate(click(), noFade, new URL("https://example.test/works"))
    ).toBe(false);
  });
});
