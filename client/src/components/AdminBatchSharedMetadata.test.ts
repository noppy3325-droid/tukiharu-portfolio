import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentsDirectory = import.meta.dirname;
const batchSource = readFileSync(resolve(componentsDirectory, "AdminBatchImageUpload.tsx"), "utf8");
const adminSource = readFileSync(resolve(componentsDirectory, "../pages/Admin.tsx"), "utf8");

describe("共通情報を使うGallery一括登録", () => {
  it("同じタイトル・キャプション・撮影詳細を入力して複数画像へ渡せる", () => {
    expect(batchSource).toContain("const [metadata, setMetadata]");
    expect(batchSource).toContain("共通タイトル");
    expect(batchSource).toContain("共通キャプション");
    expect(batchSource).toContain("detailsMode");
    expect(batchSource).toContain("onUploaded(uploaded, { ...metadata");
    expect(adminSource).toContain("title: metadata.title");
    expect(adminSource).toContain("caption: metadata.caption");
  });

  it("画像ごとの進捗と、一部失敗を含む登録結果を明示する", () => {
    expect(batchSource).toContain("const [progress, setProgress]");
    expect(batchSource).toContain("${progress.completed} / ${progress.total}件を処理中");
    expect(batchSource).toContain("uploadFailures");
    expect(batchSource).toContain("registration.failures");
    expect(batchSource).toContain("未完了 ${failures.length}件");
  });
});
