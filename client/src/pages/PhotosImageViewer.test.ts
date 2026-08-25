import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(import.meta.dirname, "Photos.tsx"), "utf8");
const viewerStyles = readFileSync(resolve(import.meta.dirname, "../gallery-image-viewer.css"), "utf8");

describe("Gallery画像の表示と拡大", () => {
  it("公開画像はクリックで拡大ダイアログを開き、通常・拡大とも保存操作を抑止する", () => {
    expect(pageSource).toContain("setSelectedPhoto(photo)");
    expect(pageSource).toContain("draggable={false}");
    expect(pageSource).toContain("onContextMenu={preventImageSave}");
    expect(pageSource).toContain("onDragStart={preventImageSave}");
    expect(pageSource).toContain("event.key.toLowerCase() === \"s\"");
  });

  it("通常表示と拡大表示で画像の元比率を維持する", () => {
    expect(viewerStyles).toContain("height:auto!important");
    expect(viewerStyles).toContain("aspect-ratio:auto!important");
    expect(viewerStyles).toContain("object-fit:contain!important");
    expect(viewerStyles).toContain("max-height:calc(100dvh - 8.5rem)");
  });
});
