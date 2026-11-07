import { describe, expect, it } from "vitest";
import { browserLocale, translateUi } from "./LocaleContext";

describe("UI language", () => {
  it("uses browser language priorities and supported regional variants", () => {
    expect(browserLocale(["en-US", "ja"])).toBe("en");
    expect(browserLocale(["ja-JP", "en"])).toBe("ja");
    expect(browserLocale(["fr", "en-GB"])).toBe("en");
    expect(browserLocale(["fr"])).toBe("ja");
  });
  it("translates known UI copy and preserves original content", () => {
    expect(translateUi("en", "制作と日々の記録")).toBe("Things I make, moments I keep");
    expect(translateUi("ja", "制作と日々の記録")).toBe("制作と日々の記録");
    expect(translateUi("en", "私が書いたブログ本文")).toBe("私が書いたブログ本文");
  });
});
