import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminSource = readFileSync(resolve(import.meta.dirname, "Admin.tsx"), "utf8");

describe("管理画面の削除確認", () => {
  it("削除操作を確認ダイアログで保護する", () => {
    expect(adminSource).toContain("function RemoveButton");
    expect(adminSource).toContain("<AlertDialog>");
    expect(adminSource).toContain("削除すると元に戻せません。");
    expect(adminSource).toContain("<AlertDialogAction onClick={onClick}");
    expect(adminSource).toContain("「{title}」を削除しますか？");
    expect(adminSource).toContain("<RemoveButton title={item.title}");
  });

  it("Galleryの単体アップロード後に必須のタイトル・キャプションを補完し、保存結果を表示する", () => {
    expect(adminSource).toContain("onUploadComplete={({ url, filename }) => setPhoto");
    expect(adminSource).toContain("title: current.title.trim() || imageTitleFromFilename(filename)");
    expect(adminSource).toContain("caption: current.caption.trim() || \"画像をアップロードしました。\"");
    expect(adminSource).toContain("Galleryへ保存しました。公開ページへ反映されます。");
    expect(adminSource).toContain("createPhoto.error?.message || updatePhoto.error?.message");
  });

  it("Works・Booksでも画像アップロード後に保存必須項目を補完し、保存結果を表示する", () => {
    expect(adminSource).toContain("scope=\"works\"");
    expect(adminSource).toContain("scope=\"books\"");
    expect(adminSource).toContain("summary: current.summary.trim() || \"画像をアップロードしました。\"");
    expect(adminSource).toContain("author: current.author.trim() || \"著者未設定\"");
    expect(adminSource).toContain("Worksへ保存しました。公開ページへ反映されます。");
    expect(adminSource).toContain("Booksへ保存しました。公開ページへ反映されます。");
  });
});
