import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminSource = readFileSync(resolve(import.meta.dirname, "Admin.tsx"), "utf8");

describe("管理画面の削除確認", () => {
  it("削除操作を確認ダイアログで保護する", () => {
    expect(adminSource).toContain("function RemoveButton");
    expect(adminSource).toContain("<AlertDialog>");
    expect(adminSource).toContain("このコンテンツを削除しますか？");
    expect(adminSource).toContain("削除すると元に戻せません。");
    expect(adminSource).toContain("<AlertDialogAction onClick={onClick}");
  });
});
