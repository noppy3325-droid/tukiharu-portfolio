export type Departure = {
  status: "estimated" | "unavailable";
  city: string;
  region: string;
  country: string;
  countryCode: string;
};
export const unavailableDeparture: Departure = {
  status: "unavailable",
  city: "",
  region: "",
  country: "",
  countryCode: "",
};

export function normalizeDeparture(value: unknown): Departure {
  if (!value || typeof value !== "object") return { ...unavailableDeparture };
  const data = value as Record<string, unknown>;
  if (data.success !== true) return { ...unavailableDeparture };
  const text = (key: string) =>
    typeof data[key] === "string"
      ? data[key]
          .replace(/[\u0000-\u001f<>]/g, "")
          .trim()
          .slice(0, 100)
      : "";
  const city = text("city"),
    region = text("region"),
    country = text("country");
  if (!city && !region && !country) return { ...unavailableDeparture };
  const countryCode =
    typeof data.country_code === "string" &&
    /^[A-Z]{2}$/.test(data.country_code)
      ? data.country_code
      : "";
  return { status: "estimated", city, region, country, countryCode };
}

export function departureLabel(
  departure: Departure | undefined,
  loading = false
) {
  if (loading) return { city: "LOCATING", detail: "地域を確認しています" };
  if (!departure || departure.status !== "estimated")
    return { city: "YOUR CITY", detail: "地域を取得できませんでした" };
  return {
    city: departure.city || departure.region || departure.country,
    detail: [
      departure.city && departure.region !== departure.city
        ? departure.region
        : "",
      departure.countryCode || departure.country,
    ]
      .filter(Boolean)
      .join(" / "),
  };
}
