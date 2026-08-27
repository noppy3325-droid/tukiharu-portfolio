import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientSource = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(clientSource, "App.tsx"), "utf8");
const layoutSource = readFileSync(resolve(clientSource, "components/TsukiLayout.tsx"), "utf8");
const gameSource = readFileSync(resolve(import.meta.dirname, "Game.tsx"), "utf8");

describe("Gameタブ", () => {
  it("公開ルートと共通ナビゲーションからゲームへ移動できる", () => {
    expect(appSource).toContain('path={"/game"}');
    expect(layoutSource).toContain('{ href: "/game", label: "Game" }');
  });

  it("第三者視点HUDとタッチ操縦の案内を表示する", () => {
    expect(gameSource).toContain("第三者追従視点");
    expect(gameSource).toContain("flight-hud");
    expect(gameSource).toContain("機首上げ");
    expect(gameSource).toContain("推力");
  });
});
