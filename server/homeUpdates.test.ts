import { describe, expect, it } from "vitest";
import { buildHomeUpdates } from "../client/src/lib/homeUpdates";

describe("buildHomeUpdates", () => {
  it("カテゴリの取得順に関係なくupdatedAtの新しい順へ統合する", () => {
    const updates = buildHomeUpdates([
      { label: "作品", title: "先週の作品", updatedAt: "2026-08-11T00:00:00.000Z" },
      { label: "ノート", title: "今日のノート", updatedAt: "2026-08-18T00:00:00.000Z" },
      { label: "写真", title: "昨日の写真", updatedAt: "2026-08-17T00:00:00.000Z" },
    ]);
    expect(updates.map(update => update.title)).toEqual(["今日のノート", "昨日の写真", "先週の作品"]);
  });
});
