import { afterEach, describe, expect, it, vi } from "vitest";
import {
  departureLabel,
  normalizeDeparture,
  unavailableDeparture,
} from "../shared/departure";
import { publicDepartureIp, visitorDeparture } from "./visitorDeparture";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("搭乗券の出発地", () => {
  it("地域だけを返し、IP・座標・接続情報を公開しない", () => {
    const result = normalizeDeparture({
      success: true,
      city: " Tokyo\n<> ",
      region: "Tokyo",
      country: "Japan",
      country_code: "JP",
      ip: "8.8.8.8",
      latitude: 35,
      longitude: 139,
      connection: { isp: "private" },
    });
    expect(result).toEqual({
      status: "estimated",
      city: "Tokyo",
      region: "Tokyo",
      country: "Japan",
      countryCode: "JP",
    });
    expect(departureLabel(result)).toEqual({ city: "Tokyo", detail: "JP" });
  });
  it("異常・空欄・取得失敗でも出発地の代替表示を返す", () => {
    for (const input of [
      null,
      [],
      { success: false },
      { success: "true", city: "x" },
      { success: true, city: 123 },
    ])
      expect(normalizeDeparture(input)).toEqual(unavailableDeparture);
    expect(departureLabel(undefined).city).toBe("YOUR CITY");
    expect(departureLabel(undefined, true).city).toBe("LOCATING");
    const regionOnly = normalizeDeparture({
      success: true,
      region: "Tokyo",
      country: "Japan",
      country_code: "invalid",
    });
    expect(departureLabel(regionOnly)).toEqual({
      city: "Tokyo",
      detail: "Japan",
    });
    expect(
      normalizeDeparture({ success: true, city: "x".repeat(300) }).city
    ).toHaveLength(100);
  });
  it("ローカル・プライベート・予約IPを照会しない（IPv6とIPv4射影も含む）", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const ip of [
      "",
      "not-an-ip",
      "127.0.0.1",
      "10.0.0.1",
      "100.64.0.1",
      "169.254.1.1",
      "172.16.1.1",
      "192.168.3.99",
      "192.0.2.1",
      "198.51.100.2",
      "203.0.113.2",
      "224.0.0.1",
      "255.255.255.255",
      "::",
      "::1",
      "fc00::1",
      "fe80::1",
      "ff02::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
    ]) {
      expect(publicDepartureIp(ip), ip).toBeNull();
      expect(await visitorDeparture(ip)).toEqual(unavailableDeparture);
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(publicDepartureIp("::ffff:8.8.8.8")).toBe("8.8.8.8");
    expect(publicDepartureIp("2606:4700:4700::1111")).toBe(
      "2606:4700:4700::1111"
    );
  });
  it("許可したHTTPSの宛先だけに照会し、成功は6時間キャッシュする", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            city: "San Jose",
            country: "United States",
            country_code: "US",
            ip: "8.8.8.8",
          })
        )
      );
    vi.stubGlobal("fetch", fetch);
    expect((await visitorDeparture("8.8.8.8")).city).toBe("San Jose");
    await visitorDeparture("8.8.8.8");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://ipwho.is/8.8.8.8?fields=success,city,region,country,country_code",
      expect.objectContaining({
        redirect: "error",
        signal: expect.any(AbortSignal),
      })
    );
    vi.advanceTimersByTime(21600001);
    await visitorDeparture("8.8.8.8");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("通信障害・制限・不正JSONを代替表示にし、失敗直後の連続照会を抑える", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(new Response("not json"))
      .mockResolvedValueOnce(new Response("x".repeat(17000)));
    vi.stubGlobal("fetch", fetch);
    expect(await visitorDeparture("1.1.1.1")).toEqual(unavailableDeparture);
    await visitorDeparture("1.1.1.1");
    expect(fetch).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(300001);
      expect(await visitorDeparture("1.1.1.1")).toEqual(unavailableDeparture);
    }
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
