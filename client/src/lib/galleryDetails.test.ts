import { describe, expect, it } from "vitest";
import { emptyGalleryDetails, galleryCameraSuggestions, hasGalleryDetails } from "./galleryDetails";

describe("Gallery撮影詳細", () => {
  it("詳細なしの値は撮影詳細として扱わない", () => {
    expect(hasGalleryDetails(emptyGalleryDetails)).toBe(false);
  });

  it("カメラ・レンズ・場所・日時のいずれかがあれば撮影詳細として扱う", () => {
    expect(hasGalleryDetails({ camera: "Nikon Z 50Ⅱ" })).toBe(true);
    expect(hasGalleryDetails({ lens: "NIKKOR Z DX 16-50mm" })).toBe(true);
    expect(hasGalleryDetails({ location: "Tokyo" })).toBe(true);
    expect(hasGalleryDetails({ takenAt: new Date("2026-08-19T10:00:00Z") })).toBe(true);
  });

  it("指定されたカメラ候補を提供する", () => {
    expect(galleryCameraSuggestions).toEqual(["Nikon Z 50Ⅱ", "Xiaomi 14T"]);
  });
});
