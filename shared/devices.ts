export const deviceCategories = [
  "computer",
  "smartphone",
  "tablet",
  "audio",
  "camera",
  "other",
] as const;
export type DeviceCategory = (typeof deviceCategories)[number];

export const deviceCategoryLabels: Record<DeviceCategory, string> = {
  computer: "パソコン",
  smartphone: "スマートフォン",
  tablet: "タブレット",
  audio: "音楽機器",
  camera: "カメラ",
  other: "その他",
};

export function deviceCategoryOf(category?: string): DeviceCategory {
  return deviceCategories.includes(category as DeviceCategory)
    ? (category as DeviceCategory)
    : "computer";
}

export function hasComputingSpecs(category: DeviceCategory) {
  return ["computer", "smartphone", "tablet"].includes(category);
}

export const deviceSpecsLabels: Record<DeviceCategory, string> = {
  computer: "補足仕様・周辺機器",
  smartphone: "画面・カメラ・周辺機器など",
  tablet: "画面・ペン・キーボードなど",
  audio: "接続方式・DAC・ヘッドホンなど",
  camera: "センサー・レンズ・撮影設定など",
  other: "主な仕様・組み合わせ",
};
