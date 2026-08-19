export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedContentImageUrl(value: string) {
  return value.startsWith("/manus-storage/") || isHttpsUrl(value);
}
