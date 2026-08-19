export type GalleryDetailFields = {
  camera?: string | null;
  lens?: string | null;
  location?: string | null;
  takenAt?: Date | string | null;
};

export const emptyGalleryDetails = {
  camera: "",
  lens: "",
  location: "",
  takenAt: "",
} as const;

export const galleryCameraSuggestions = ["Nikon Z 50Ⅱ", "Xiaomi 14T"] as const;

export function hasGalleryDetails(details: GalleryDetailFields) {
  return Boolean(details.camera?.trim() || details.lens?.trim() || details.location?.trim() || details.takenAt);
}
