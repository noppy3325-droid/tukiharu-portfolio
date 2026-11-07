import { createClientId } from "./clientId";

const storageKey = "little-room-visitor-key";
let documentKey: string | undefined;

export function getVisitorKey(): string {
  if (documentKey) return documentKey;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return (documentKey = saved);
  } catch {
    // Storage is optional. Reading an article must work with storage blocked.
  }
  documentKey = createClientId();
  try {
    localStorage.setItem(storageKey, documentKey);
  } catch {
    /* Keep this document's key. */
  }
  return documentKey;
}
