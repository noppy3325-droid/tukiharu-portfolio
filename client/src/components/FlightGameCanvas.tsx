import { Engine } from "@babylonjs/core/Engines/engine";
import { useEffect, useRef } from "react";
import { createGameScene, type GameHandle } from "@/game/scene";

export function FlightGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let disposed = false;
    createGameScene(engine, canvas).then(value => {
      if (disposed) { value.dispose(); return; }
      handle = value;
      engine.runRenderLoop(() => value.scene.render());
    });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      engine.stopRenderLoop();
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return <canvas ref={canvasRef} className="flight-game-canvas" aria-label="飛行機着陸ゲームの画面" style={{ touchAction: "none" }} />;
}
