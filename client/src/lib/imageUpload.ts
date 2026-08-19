export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxImageUploadBytes = 5 * 1024 * 1024;

export function validateImageSelection(file: Pick<File, "type" | "size">): string | null {
  if (!(acceptedImageMimeTypes as readonly string[]).includes(file.type)) {
    return "JPEG・PNG・WebP形式の画像を選択してください。";
  }
  if (file.size > maxImageUploadBytes) {
    return "画像は5MB以下にしてください。";
  }
  return null;
}
