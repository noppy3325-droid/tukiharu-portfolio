import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SEKKI_COLORS,
  getSekkiColor,
  formatFluxTime,
  millisecondsUntilNextMinute,
} from "./sekkiColors";

describe("Flux seasonal calendar", () => {
  it("preserves every field of the supplied canonical Markdown table", () => {
    const text = readFileSync(
      new URL("../../../docs/flux-sekki-colors.md", import.meta.url),
      "utf8"
    );
    const rows = text
      .split("\n")
      .filter(line => /^\|\s*\d+\s*\|/.test(line))
      .map(line =>
        line
          .split("|")
          .slice(1, -1)
          .map(value => value.trim())
      );
    expect(rows).toHaveLength(24);
    expect(
      SEKKI_COLORS.map(color => [
        color.sekki,
        color.sekkiReading,
        `${color.startMonth}月${color.startDay}日`,
        color.colorName,
        color.colorReading,
        color.romaji,
        color.hex,
        color.line,
      ])
    ).toEqual(rows.map(row => row.slice(1)));
  });
  it("contains 24 complete, unique sets in calendar order", () => {
    expect(SEKKI_COLORS).toHaveLength(24);
    expect(new Set(SEKKI_COLORS.map(color => color.sekki)).size).toBe(24);
    for (const color of SEKKI_COLORS) {
      for (const field of [
        color.sekki,
        color.sekkiReading,
        color.colorName,
        color.colorReading,
        color.romaji,
        color.line,
      ]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(Array.from(color.line).length).toBeLessThanOrEqual(60);
      const start = new Date(2026, color.startMonth - 1, color.startDay);
      expect(start.getMonth() + 1).toBe(color.startMonth);
      expect(start.getDate()).toBe(color.startDay);
    }
    const dates = SEKKI_COLORS.map(
      color => color.startMonth * 100 + color.startDay
    );
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it.each([
    [2026, 11, 7, "立冬"],
    [2026, 1, 3, "冬至"],
    [2026, 2, 4, "立春"],
    [2026, 6, 21, "夏至"],
    [2026, 12, 21, "冬至"],
    [2028, 2, 29, "雨水"],
    [2027, 1, 1, "冬至"],
    [2026, 1, 4, "冬至"],
  ])(
    "selects %i-%i-%i → %s using the visitor's local date",
    (year, month, day, sekki) => {
      expect(getSekkiColor(new Date(year, month - 1, day)).sekki).toBe(sekki);
      expect(getSekkiColor(new Date(year, month - 1, day, 23, 59)).sekki).toBe(
        sekki
      );
    }
  );

  it("changes at each of the 24 local midnight boundaries, including January", () => {
    SEKKI_COLORS.forEach((color, index) => {
      const start = new Date(2026, color.startMonth - 1, color.startDay);
      expect(getSekkiColor(start)).toBe(color);
      expect(getSekkiColor(new Date(start.getTime() - 1))).toBe(
        SEKKI_COLORS[(index + 23) % 24]
      );
    });
  });

  it("formats local time with two digits and no seconds", () => {
    expect(formatFluxTime(new Date(2026, 10, 7, 0, 5, 59))).toBe("00:05");
    expect(formatFluxTime(new Date(2026, 10, 7, 23, 59))).toBe("23:59");
  });

  it("schedules the actual next minute without one-second polling", () => {
    expect(
      millisecondsUntilNextMinute(new Date(2026, 10, 7, 12, 34, 56, 789))
    ).toBe(3211);
    expect(millisecondsUntilNextMinute(new Date(2026, 10, 7, 12, 35))).toBe(
      60000
    );
    expect(
      millisecondsUntilNextMinute(new Date(2026, 10, 7, 23, 59, 59, 999))
    ).toBe(1);
  });
});
