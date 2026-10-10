import { describe, expect, it } from "vitest";
import { buildHomePreview, buildHomeUpdates } from "../client/src/lib/homeUpdates";

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

describe("buildHomePreview", () => {
  const entry = (id: string, kind: string, day: number) => ({
    id, kind, updatedAt: new Date(Date.UTC(2026, 9, day)),
  });

  it("新しいBlogが多数あっても各カテゴリの最新記録を優先する", () => {
    const sources = [
      ...Array.from({ length: 15 }, (_, i) => entry(`note-${i}`, "note", 30 - i)),
      entry("work-new", "work", 12), entry("work-old", "work", 11),
      entry("photo", "photo", 10), entry("book", "book", 9),
    ];
    const original = [...sources];
    expect(buildHomePreview(sources).map(item => item.id)).toEqual([
      "note-0", "work-new", "photo", "book",
    ]);
    expect(sources).toEqual(original);
  });

  it("カテゴリが少ない場合も均等に次の記録を選んで最大4件にする", () => {
    expect(buildHomePreview([
      entry("n1", "note", 10), entry("n2", "note", 9),
      entry("n3", "note", 8), entry("w1", "work", 7),
      entry("w2", "work", 6),
    ]).map(item => item.id)).toEqual(["n1", "w1", "n2", "w2"]);
  });

  it("未登録や1件だけの状態でも空の枠を追加しない", () => {
    expect(buildHomePreview([])).toEqual([]);
    const item = entry("photo", "photo", 1);
    expect(buildHomePreview([item])).toEqual([item]);
  });
});
