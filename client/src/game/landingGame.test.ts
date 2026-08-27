import { describe, expect, it } from "vitest";
import { LandingGame } from "./landingGame";

describe("LandingGame", () => {
  it("推力入力で準備状態から飛行へ移り、速度を更新する", () => {
    const game = new LandingGame();
    game.setInput("thrust", true);
    const snapshot = game.update(0.05);
    expect(snapshot.status).toBe("flying");
    expect(snapshot.thrust).toBeGreaterThan(0);
    expect(snapshot.speed).toBeGreaterThan(15);
  });

  it("方向操作で機首角度を更新し、リセットで開始状態へ戻る", () => {
    const game = new LandingGame();
    game.setInput("pitchUp", true);
    const turning = game.update(0.05);
    expect(turning.pitch).toBeGreaterThan(-0.05);
    game.reset();
    expect(game.getSnapshot()).toMatchObject({ status: "ready", altitude: 18, score: 0 });
  });

  it("デモモードでは決定的な着陸成功状態まで進行する", () => {
    const game = new LandingGame(true);
    for (let index = 0; index < 170; index += 1) game.update(0.05);
    expect(game.getSnapshot()).toMatchObject({ status: "landed", score: 184, altitude: 0 });
  });
});
