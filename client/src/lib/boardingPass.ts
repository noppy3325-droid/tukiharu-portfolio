import { create } from "qrcode";

export function socialIdentity(value: string, service: "github" | "x") {
  try {
    const url = new URL(value);
    const hosts = service === "github" ? ["github.com", "www.github.com"] : ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
    if (url.protocol !== "https:" || url.username || url.password || !hosts.includes(url.hostname)) return null;
    const name = url.pathname.split("/").filter(Boolean)[0];
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name) || ["intent", "share", "login", "settings", "home"].includes(name.toLowerCase())) return null;
    return { label: `@${name}`, url: `https://${service === "github" ? "github.com" : "x.com"}/${name}` };
  } catch { return null; }
}

export function createQrArtwork(url: string) {
  const qr = create(url, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  let path = "";
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
    }
  }
  return { path, size: qr.modules.size + quietZone * 2 };
}
