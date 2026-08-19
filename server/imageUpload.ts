export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_BASE64_MAX_LENGTH = Math.ceil((IMAGE_UPLOAD_MAX_BYTES * 4) / 3) + 4;

export const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof allowedImageMimeTypes)[number];

const imageExtensions: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasExpectedSignature(data: Buffer, mimeType: AllowedImageMimeType): boolean {
  if (mimeType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
}

export function decodeAndValidateImage(base64: string, mimeType: AllowedImageMimeType): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("画像データの形式が正しくありません。");
  }

  const data = Buffer.from(base64, "base64");
  if (data.length === 0) throw new Error("空の画像はアップロードできません。");
  if (data.length > IMAGE_UPLOAD_MAX_BYTES) throw new Error("画像は5MB以下にしてください。");
  if (!hasExpectedSignature(data, mimeType)) throw new Error("選択した形式と画像データが一致しません。");

  return data;
}

export function createImageStorageKey(fileName: string, mimeType: AllowedImageMimeType): string {
  const extension = imageExtensions[mimeType];
  const normalizedName = fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "gallery-image";

  const month = new Date().toISOString().slice(0, 7);
  return `gallery/${month}/${normalizedName}.${extension}`;
}
