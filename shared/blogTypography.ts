export const blogFontSizes = [
  "14",
  "16",
  "18",
  "20",
  "24",
  "28",
  "32",
] as const;
export const blogLineHeights = [
  "1.4",
  "1.6",
  "1.8",
  "2",
  "2.2",
  "2.5",
] as const;
export const blogAlignments = ["left", "center", "right"] as const;

export const blogTypographyAttributes = {
  fontSize: { html: "data-font-size", values: blogFontSizes },
  lineHeight: { html: "data-line-height", values: blogLineHeights },
  textAlign: { html: "data-text-align", values: blogAlignments },
};
