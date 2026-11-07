import { describe, expect, it } from "vitest";
import { SEKKI_COLORS } from "./sekkiColors";
import { FLUX_PALETTES, getFluxSelection, getFluxPeriod } from "./fluxPalettes";

describe("seasonal morning/day/evening/night palettes", () => {
  it("provides 96 distinct seasonal phrases and 48 colors without replacing the original 24", () => {
    const entries = Object.values(FLUX_PALETTES).flatMap(palette =>
      Object.values(palette)
    );
    expect(entries).toHaveLength(96);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(96);
    expect(new Set(entries.map(entry => entry.line)).size).toBe(96);
    expect(new Set(entries.map(entry => entry.hex)).size).toBe(48);
    for (const base of SEKKI_COLORS) {
      const palette = Object.values(FLUX_PALETTES[base.sekki]);
      expect(palette).toHaveLength(4);
      expect(new Set(palette.map(entry => entry.hex)).size).toBe(4);
      expect(
        palette.some(
          entry =>
            entry.colorName === base.colorName &&
            entry.hex === base.hex &&
            entry.line === base.line
        )
      ).toBe(true);
      for (const entry of palette) {
        expect(entry.sekki).toBe(base.sekki);
        expect(entry.startMonth).toBe(base.startMonth);
        expect(entry.startDay).toBe(base.startDay);
        expect(entry.hex).toMatch(/^#[0-9A-F]{6}$/);
        expect(
          entry.colorName && entry.colorReading && entry.romaji && entry.line
        ).toBeTruthy();
        expect(Array.from(entry.line).length).toBeLessThanOrEqual(60);
      }
    }
  });
  it.each([
    [0, "night"],
    [4, "night"],
    [5, "morning"],
    [9, "morning"],
    [10, "day"],
    [15, "day"],
    [16, "evening"],
    [18, "evening"],
    [19, "night"],
    [23, "night"],
  ] as const)("selects local hour %i as %s", (hour, period) => {
    expect(getFluxPeriod(new Date(2026, 10, 7, hour))).toBe(period);
  });
  it("holds the same four-set rotation throughout a term and across reloads", () => {
    for (const hour of [6, 12, 17, 21]) {
      expect(getFluxSelection(new Date(2026, 10, 7, hour))).toBe(
        getFluxSelection(new Date(2026, 10, 21, hour))
      );
      expect(getFluxSelection(new Date(2026, 10, 7, hour))).not.toBe(
        getFluxSelection(new Date(2026, 10, 22, hour))
      );
    }
    expect(getFluxSelection(new Date(2027, 0, 3, 21)).sekki).toBe("冬至");
  });
  it("changes at the actual local time boundary, and reuses stable objects between minutes", () => {
    for (const hour of [5, 10, 16, 19]) {
      const boundary = new Date(2026, 10, 7, hour);
      expect(getFluxSelection(new Date(boundary.getTime() - 1)).id).not.toBe(
        getFluxSelection(boundary).id
      );
      expect(getFluxSelection(boundary)).toBe(
        getFluxSelection(new Date(boundary.getTime() + 60000))
      );
    }
  });
});
