import { emptyGalleryDetails, type GalleryDetailDraft } from "./galleryDetails";

type Tag = { value?: unknown; description?: unknown };
export type PhotoTags = Record<string, Tag | undefined>;
export type PhotoMetadata = Partial<Omit<GalleryDetailDraft, "location">>;

function text(tag?: Tag): string {
  const value = Array.isArray(tag?.value) ? tag.value[0] : tag?.value;
  return typeof value === "string" ? value.replace(/\0/g, "").trim() : "";
}

function number(tag?: Tag): number | undefined {
  let value = tag?.value;
  if (Array.isArray(value) && value.length === 1) value = value[0];
  if (Array.isArray(value) && value.length === 2 && value.every(item => typeof item === "number")) {
    value = value[1] ? value[0] / value[1] : NaN;
  }
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

const decimal = (value: number) => Number(value.toFixed(3)).toString();

export function toDateTimeLocal(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function captureDate(value: string, offset: string): string {
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month, day, hour, minute, second] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  // Check the camera's wall-clock date without allowing JS to normalize impossible dates.
  const check = new Date(`${iso}Z`);
  if (!Number.isFinite(check.getTime()) || check.toISOString().slice(0, 19) !== iso) return "";
  return /^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) ? toDateTimeLocal(`${iso}${offset}`) : iso;
}

export function photoMetadataFromTags(tags: PhotoTags): PhotoMetadata {
  const result: PhotoMetadata = {};
  const make = text(tags.Make);
  const model = text(tags.Model);
  const camera = model && make && !model.toLowerCase().startsWith(make.toLowerCase()) ? `${make} ${model}` : model || make;
  if (camera) result.camera = camera.slice(0, 180);
  const lens = text(tags.LensModel);
  if (lens) result.lens = lens.slice(0, 180);
  const takenAt = captureDate(text(tags.DateTimeOriginal) || text(tags.DateTimeDigitized), text(tags.OffsetTimeOriginal));
  if (takenAt) result.takenAt = takenAt;
  const focal = number(tags.FocalLength);
  const aperture = number(tags.FNumber);
  const exposure = number(tags.ExposureTime);
  const iso = number(tags.ISOSpeedRatings) ?? number(tags.PhotographicSensitivity) ?? number(tags.ISO);
  if (focal) result.focalLength = `${decimal(focal)} mm`;
  if (aperture) result.aperture = `f/${decimal(aperture)}`;
  if (exposure) {
    const reciprocal = 1 / exposure;
    result.shutterSpeed = exposure < 1 && Math.abs(reciprocal - Math.round(reciprocal)) < 0.01
      ? `1/${Math.round(reciprocal)} s` : `${Number(exposure.toPrecision(4))} s`;
  }
  if (iso) result.iso = String(Math.round(iso));
  return result;
}

export async function readPhotoMetadata(file: Blob): Promise<PhotoMetadata> {
  try {
    // Lazy load only when an original Gallery file is selected, before canvas compression.
    const { load } = await import("exifreader");
    const tags = load(await file.arrayBuffer(), { expanded: true });
    return photoMetadataFromTags((tags.exif ?? {}) as PhotoTags);
  } catch {
    // Missing or malformed metadata must never prevent uploading the image.
    return {};
  }
}

export function resolveBatchDetails(mode: "auto" | "none" | "details", common: GalleryDetailDraft, extracted: PhotoMetadata): GalleryDetailDraft {
  if (mode === "none") return { ...emptyGalleryDetails };
  const details: GalleryDetailDraft = { ...emptyGalleryDetails, ...extracted };
  if (mode === "details") {
    for (const key of Object.keys(emptyGalleryDetails) as Array<keyof GalleryDetailDraft>) {
      if (common[key].trim()) details[key] = common[key].trim();
    }
  }
  return details;
}
