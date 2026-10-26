import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeviceCard } from "./DeviceCard";
import { defaultProfile, type Device } from "@shared/profile";
import { profileSchema } from "@shared/profileSchema";
import { deviceCategories, deviceCategoryLabels } from "@shared/devices";

const legacy: Device = {
  name: "登録済みのPC",
  imageUrl: "",
  os: "Windows",
  cpu: "既存CPU",
  memory: "32GB",
  storage: "1TB",
  software: "制作アプリ",
};

describe("gear profiles", () => {
  it("keeps old computer fields when adding default equipment metadata", () => {
    const parsed = profileSchema.parse({
      ...defaultProfile,
      devices: [legacy],
    });
    expect(parsed.devices[0]).toEqual({
      ...legacy,
      category: "computer",
      specifications: "",
      note: "",
    });
    const markup = renderToStaticMarkup(
      <DeviceCard device={legacy} index={0} />
    );
    expect(markup).toContain("パソコン / 01");
    expect(markup).toContain("既存CPU");
    expect(markup).toContain("制作アプリ");
  });
  it("accepts every category and preserves multiline specifications and notes", () => {
    const devices = deviceCategories.map(category => ({
      name: `${category}機材`,
      imageUrl: "",
      category,
      specifications: "仕様A\n仕様B",
      note: "日々使っています。",
    }));
    const result = profileSchema.parse({ ...defaultProfile, devices });
    result.devices.forEach((device, index) => {
      expect(device.specifications).toBe("仕様A\n仕様B");
      const markup = renderToStaticMarkup(
        <DeviceCard device={device} index={index} />
      );
      expect(markup).toContain(deviceCategoryLabels[device.category]);
      expect(markup).toContain("仕様A\n仕様B");
      expect(markup).toContain("日々使っています。");
    });
  });
  it("does not render hidden PC fields on a camera or audio device", () => {
    for (const category of ["camera", "audio"] as const) {
      const markup = renderToStaticMarkup(
        <DeviceCard
          device={{ ...legacy, category, specifications: "接続・レンズの仕様" }}
          index={0}
        />
      );
      expect(markup).not.toContain("既存CPU");
      expect(markup).not.toContain("制作アプリ");
      expect(markup).toContain("接続・レンズの仕様");
    }
  });
  it("rejects an unsupported equipment category", () => {
    expect(
      profileSchema.safeParse({
        ...defaultProfile,
        devices: [{ ...legacy, category: "invalid" }],
      }).success
    ).toBe(false);
  });
});
