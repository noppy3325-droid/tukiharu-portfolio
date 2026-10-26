export type GalleryDetailFields = {
  camera?: string | null;
  lens?: string | null;
  location?: string | null;
  takenAt?: Date | string | null;
  focalLength?: string | null;
  aperture?: string | null;
  shutterSpeed?: string | null;
  iso?: string | null;
};

export const emptyGalleryDetails = {
  camera: "",
  lens: "",
  location: "",
  takenAt: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  iso: "",
} as const;

export type GalleryDetailDraft = { -readonly [Key in keyof typeof emptyGalleryDetails]: string };

export const exposureFields = [
  ["focalLength", "焦点距離", "40 mm"],
  ["aperture", "絞り値（F値）", "f/2.8"],
  ["shutterSpeed", "シャッタースピード", "1/250 s"],
  ["iso", "ISO感度", "400"],
] as const;

export function galleryDetailSummary(details: GalleryDetailFields): string {
  const date = details.takenAt ? new Date(details.takenAt) : null;
  const takenAt = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium" }).format(date) : "";
  return [takenAt, details.camera, details.lens, details.focalLength, details.aperture, details.shutterSpeed, details.iso ? `ISO ${details.iso}` : "", details.location].filter(Boolean).join(" · ");
}

export const galleryCameraSuggestions = ["Nikon Z 50Ⅱ", "Xiaomi 14T"] as const;
export const galleryLensSuggestions = ["NIKKOR Z 40mm f/2", "NIKKOR Z DX 16-50mm f/3.5-6.3 VR", "NIKKOR Z DX 50-250mm f/4.5-6.3 VR"] as const;

export function hasGalleryDetails(details: GalleryDetailFields) {
  return Boolean(details.camera?.trim() || details.lens?.trim() || details.location?.trim() || details.takenAt || details.focalLength?.trim() || details.aperture?.trim() || details.shutterSpeed?.trim() || details.iso?.trim());
}
