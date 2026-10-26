import { BlockList, isIP } from "node:net";
import {
  normalizeDeparture,
  unavailableDeparture,
  type Departure,
} from "../shared/departure";

const excluded = new BlockList();
for (const [network, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  excluded.addSubnet(network, bits, "ipv4");
for (const [network, bits] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const)
  excluded.addSubnet(network, bits, "ipv6");
const cache = new Map<string, { expires: number; value: Departure }>();

export function publicDepartureIp(input: string): string | null {
  const ip = input.replace(/^::ffff:(?=\d+\.)/i, "");
  const family = isIP(ip);
  return family && !excluded.check(ip, family === 4 ? "ipv4" : "ipv6")
    ? ip
    : null;
}
export async function visitorDeparture(input: string): Promise<Departure> {
  const ip = publicDepartureIp(input);
  if (!ip) return { ...unavailableDeparture };
  const saved = cache.get(ip);
  if (saved && saved.expires > Date.now()) return saved.value;
  let value = { ...unavailableDeparture };
  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country,country_code`,
      { signal: AbortSignal.timeout(2500), redirect: "error" }
    );
    if (response.ok) {
      const text = await response.text();
      if (text.length <= 16384) value = normalizeDeparture(JSON.parse(text));
    }
  } catch {
    /* Printing remains available if the provider is unavailable. */
  }
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(ip, {
    expires: Date.now() + (value.status === "estimated" ? 21600000 : 300000),
    value,
  });
  return value;
}
