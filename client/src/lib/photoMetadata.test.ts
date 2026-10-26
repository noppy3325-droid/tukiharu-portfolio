import { describe, expect, it } from "vitest";
import { jpegExifFixture, photoExifFixture, webpExifFixture } from "./__fixtures__/photoExif";
import { photoMetadataFromTags, readPhotoMetadata, resolveBatchDetails, toDateTimeLocal } from "./photoMetadata";
import { emptyGalleryDetails, galleryDetailSummary, hasGalleryDetails } from "./galleryDetails";

const expected = { camera: "Nikon Z 50II", lens: "NIKKOR Z 40mm f/2", takenAt: "2026-10-13T14:15:16", focalLength: "40 mm", aperture: "f/2.8", shutterSpeed: "1/250 s", iso: "400" };

describe("Gallery EXIF auto-fill", () => {
  it.each([true, false])("reads all six items from an original JPEG (%s endian)", async littleEndian => {
    expect(await readPhotoMetadata(new Blob([jpegExifFixture(photoExifFixture(littleEndian)) as BlobPart]))).toEqual(expected);
  });
  it("reads WebP EXIF before compression", async () => {
    expect(await readPhotoMetadata(new Blob([webpExifFixture() as BlobPart]))).toEqual(expected);
  });
  it("keeps each batch image's metadata separate and overrides only filled common fields", () => {
    const common = { ...emptyGalleryDetails, camera: "手動カメラ", aperture: "f/8", location: "手動の場所" };
    expect(resolveBatchDetails("auto", common, expected)).toEqual({ ...emptyGalleryDetails, ...expected });
    expect(resolveBatchDetails("details", common, expected)).toEqual({ ...emptyGalleryDetails, ...expected, camera: "手動カメラ", aperture: "f/8", location: "手動の場所" });
    expect(resolveBatchDetails("none", common, expected)).toEqual(emptyGalleryDetails);
    expect(resolveBatchDetails("auto", common, { iso: "1600" }).iso).toBe("1600");
  });
  it("does not invent dates from modified times, accept impossible dates, or return GPS", () => {
    expect(photoMetadataFromTags({ DateTime: { value: ["2026:10:13 12:00:00"] }, GPSLatitude: { value: 35 } })).toEqual({});
    expect(photoMetadataFromTags({ DateTimeOriginal: { value: ["2026:02:30 12:00:00"] } })).toEqual({});
  });
  it("honors an explicit EXIF timezone and preserves seconds when editing stored dates", () => {
    const result = photoMetadataFromTags({ DateTimeOriginal: { value: ["2026:10:13 14:15:16"] }, OffsetTimeOriginal: { value: ["+09:00"] } });
    expect(result.takenAt).toBe(toDateTimeLocal("2026-10-13T14:15:16+09:00"));
    expect(new Date(result.takenAt!).toISOString()).toBe("2026-10-13T05:15:16.000Z");
  });
  it("formats long exposures and ignores invalid numeric metadata", () => {
    expect(photoMetadataFromTags({ ExposureTime: { value: [[30, 1]] }, FNumber: { value: [[0, 0]] }, FocalLength: { value: -1 }, ISO: { value: Infinity } })).toEqual({ shutterSpeed: "30 s" });
  });
  it("handles metadata-free and truncated files without blocking uploads", async () => {
    expect(await readPhotoMetadata(new Blob([new Uint8Array([255, 216, 255, 217])]))).toEqual({});
    expect(await readPhotoMetadata(new Blob([jpegExifFixture().slice(0, 25) as BlobPart]))).toEqual({});
  });
  it("shows exposure-only details and stays compatible with old photographs", () => {
    expect(hasGalleryDetails({ aperture: "f/2.8" })).toBe(true);
    expect(galleryDetailSummary({ camera: "既存カメラ", takenAt: null })).toBe("既存カメラ");
    expect(galleryDetailSummary(expected)).toContain("40 mm · f/2.8 · 1/250 s · ISO 400");
  });
});
