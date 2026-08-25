export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMimeType = (typeof acceptedImageMimeTypes)[number];
export const maxImageUploadBytes = 5 * 1024 * 1024;
export const preferredImageUploadBytes = 3 * 1024 * 1024;
export const minPreferredImageUploadBytes = 512 * 1024;
export const maxImageSourceBytes = 20 * 1024 * 1024;
export const maxImageDimension = 1600;
export const maxBatchImageCount = 12;

export const imageOptimizationModes = ["quality", "balanced", "size"] as const;
export type ImageOptimizationMode = (typeof imageOptimizationModes)[number];
export const imageOptimizationModeLabels: Record<ImageOptimizationMode, string> = {
  quality: "画質優先",
  balanced: "バランス",
  size: "容量優先",
};

export type CompressedImage = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  keptOriginal: boolean;
  optimizationMode: ImageOptimizationMode;
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

export function calculatePreferredImageUploadBytes(sourceBytes: number) {
  return Math.min(preferredImageUploadBytes, Math.max(minPreferredImageUploadBytes, Math.floor(sourceBytes * 0.75)));
}

export function getImageOptimizationSettings(mode: ImageOptimizationMode, sourceBytes: number) {
  if (mode === "quality") return { maxDimension: 1920, targetBytes: Math.min(4 * 1024 * 1024, Math.max(1024 * 1024, Math.floor(sourceBytes * 0.9))), qualities: [0.86, 0.8, 0.74, 0.68] };
  if (mode === "size") return { maxDimension: 1200, targetBytes: Math.min(1536 * 1024, Math.max(320 * 1024, Math.floor(sourceBytes * 0.55))), qualities: [0.68, 0.58, 0.48, 0.38] };
  return { maxDimension: maxImageDimension, targetBytes: calculatePreferredImageUploadBytes(sourceBytes), qualities: [0.78, 0.68, 0.58, 0.48] };
}

export function createUploadImageResult({
  source,
  output,
  originalWidth,
  originalHeight,
  targetWidth,
  targetHeight,
  optimizationMode,
}: {
  source: File;
  output: Blob;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  optimizationMode: ImageOptimizationMode;
}): CompressedImage {
  const outputMimeType = isAcceptedImageMimeType(output.type) ? output.type : null;
  if (!outputMimeType) {
    if (source.size <= maxImageUploadBytes) {
      return { file: source, originalBytes: source.size, compressedBytes: source.size, width: originalWidth, height: originalHeight, keptOriginal: true, optimizationMode };
    }
    throw new Error("このブラウザでは画像形式を安全に変換できません。JPEGまたはPNGを5MB以下にして選択してください。");
  }

  if (shouldKeepOriginalImage(source.size, output.size)) {
    return { file: source, originalBytes: source.size, compressedBytes: source.size, width: originalWidth, height: originalHeight, keptOriginal: true, optimizationMode };
  }

  const file = new File([output], imageFilenameForMimeType(source.name, outputMimeType), { type: outputMimeType, lastModified: Date.now() });
  return { file, originalBytes: source.size, compressedBytes: output.size, width: targetWidth, height: targetHeight, keptOriginal: false, optimizationMode };
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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: AcceptedImageMimeType, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像を圧縮できませんでした。")), mimeType, quality));
}

async function canvasToOptimizedBlob(canvas: HTMLCanvasElement, sourceMimeType: AcceptedImageMimeType, quality: number): Promise<Blob> {
  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp.type === "image/webp" || sourceMimeType !== "image/jpeg") return webp;
  return canvasToBlob(canvas, "image/jpeg", quality);
}

export async function compressImageForUpload(source: File, optimizationMode: ImageOptimizationMode = "balanced"): Promise<CompressedImage> {
  const image = await loadImage(source);
  const settings = getImageOptimizationSettings(optimizationMode, source.size);
  const target = calculateImageDimensions(image.naturalWidth, image.naturalHeight, settings.maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を圧縮できませんでした。");
  context.drawImage(image, 0, 0, target.width, target.height);

  let output: Blob | null = null;
  for (const quality of settings.qualities) {
    const candidate = await canvasToOptimizedBlob(canvas, source.type as AcceptedImageMimeType, quality);
    if (!output || candidate.size < output.size) output = candidate;
    if (output.size <= settings.targetBytes) break;
  }
  if (!output || output.size > maxImageUploadBytes) throw new Error("変換後も5MBを超えています。より小さな画像を選択してください。");

  return createUploadImageResult({
    source,
    output,
    originalWidth: image.naturalWidth,
    originalHeight: image.naturalHeight,
    targetWidth: target.width,
    targetHeight: target.height,
    optimizationMode,
  });
}
