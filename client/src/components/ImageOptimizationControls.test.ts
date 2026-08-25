import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentsDirectory = import.meta.dirname;
const singleUploadSource = readFileSync(resolve(componentsDirectory, "AdminImageUpload.tsx"), "utf8");
const batchUploadSource = readFileSync(resolve(componentsDirectory, "AdminBatchImageUpload.tsx"), "utf8");
const richTextSource = readFileSync(resolve(componentsDirectory, "RichTextEditor.tsx"), "utf8");

describe("画像最適化の選択欄", () => {
  it("単体・一括Gallery・Blog本文の各画像アップロードで最適化モードを圧縮処理へ渡す", () => {
    expect(singleUploadSource).toContain("const [optimizationMode, setOptimizationMode]");
    expect(singleUploadSource).toContain("compressImageForUpload(file, optimizationMode)");
    expect(batchUploadSource).toContain("compressImageForUpload(file, optimizationMode)");
    expect(richTextSource).toContain("compressImageForUpload(file, optimizationMode)");
  });

  it("画質優先・バランス・容量優先の選択肢を共通ラベルから表示する", () => {
    expect(singleUploadSource).toContain("imageOptimizationModeLabels");
    expect(batchUploadSource).toContain("imageOptimizationModeLabels");
    expect(richTextSource).toContain("imageOptimizationModeLabels");
  });
});
