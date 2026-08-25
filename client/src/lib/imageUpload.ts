export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMimeType = (typeof acceptedImageMimeTypes)[number];
export const maxImageUploadBytes = 5 * 1024 * 1024;
export const maxImageSourceBytes = 20 * 1024 * 1024;
export const maxImageDimension = 1920;
export const maxBatchImageCount = 12;

export type CompressedImage = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  keptOriginal: boolean;
};

const imageExtensions: Record<AcceptedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAcceptedImageMimeType(mimeType: string): mimeType is AcceptedImageMimeType {
  return (acceptedImageMimeTypes as readonly string[]).includes(mimeType);
}

export function imageFilenameForMimeType(filename: string, mimeType: AcceptedImageMimeType) {
  const stem = filename.replace(/\.[^.]+$/, "").trim() || "gallery-image";
  return `${stem}.${imageExtensions[mimeType]}`;
}

export function shouldKeepOriginalImage(sourceBytes: number, convertedBytes: number) {
  return sourceBytes <= maxImageUploadBytes && convertedBytes >= sourceBytes;
}

export function createUploadImageResult({
  source,
  output,
  originalWidth,
  originalHeight,
  targetWidth,
  targetHeight,
}: {
  source: File;
  output: Blob;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
}): CompressedImage {
  const outputMimeType = isAcceptedImageMimeType(output.type) ? output.type : null;
  if (!outputMimeType) {
    if (source.size <= maxImageUploadBytes) {
      return { file: source, originalBytes: source.size, compressedBytes: source.size, width: originalWidth, height: originalHeight, keptOriginal: true };
    }
    throw new Error("このブラウザでは画像形式を安全に変換できません。JPEGまたはPNGを5MB以下にして選択してください。");
  }

  if (shouldKeepOriginalImage(source.size, output.size)) {
    return { file: source, originalBytes: source.size, compressedBytes: source.size, width: originalWidth, height: originalHeight, keptOriginal: true };
  }

  const file = new File([output], imageFilenameForMimeType(source.name, outputMimeType), { type: outputMimeType, lastModified: Date.now() });
  return { file, originalBytes: source.size, compressedBytes: output.size, width: targetWidth, height: targetHeight, keptOriginal: false };
}

export function validateImageSelection(file: Pick<File, "type" | "size">): string | null {
  if (!isAcceptedImageMimeType(file.type)) return "JPEG・PNG・WebP形式の画像を選択してください。";
  if (file.size > maxImageSourceBytes) return "元画像は20MB以下にしてください。";
  return null;
}

export function calculateImageDimensions(width: number, height: number, maxDimension = maxImageDimension) {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) return { width, height };
  const scale = maxDimension / longestSide;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function formatImageBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function imageTitleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled image";
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) return reject(new Error("画像データの形式が正しくありません。"));
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像を読み込めませんでした。")); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像を圧縮できませんでした。")), "image/webp", quality));
}

export async function compressImageForUpload(source: File): Promise<CompressedImage> {
  const image = await loadImage(source);
  const target = calculateImageDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を圧縮できませんでした。");
  context.drawImage(image, 0, 0, target.width, target.height);

  let output: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62, 0.55]) {
    output = await canvasToBlob(canvas, quality);
    if (output.size <= maxImageUploadBytes) break;
  }
  if (!output || output.size > maxImageUploadBytes) throw new Error("変換後も5MBを超えています。より小さな画像を選択してください。");

  return createUploadImageResult({
    source,
    output,
    originalWidth: image.naturalWidth,
    originalHeight: image.naturalHeight,
    targetWidth: target.width,
    targetHeight: target.height,
  });
}
