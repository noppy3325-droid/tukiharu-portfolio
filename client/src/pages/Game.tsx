import { FlightGameCanvas } from "@/components/FlightGameCanvas";
import { TsukiLayout } from "@/components/TsukiLayout";
import type { FlightAction, FlightSnapshot } from "@/game/landingGame";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

const initialFlight: FlightSnapshot = { status: "ready", x: -64, altitude: 18, speed: 15, verticalSpeed: -1.2, pitch: -0.05, thrust: 0, score: 0, message: "推力を入れて、滑走路へ進入してください。" };
const statusLabels = { ready: "READY", flying: "APPROACH", landed: "LANDED", crashed: "RETRY" } as const;

export default function Game() {
  const [flight, setFlight] = useState<FlightSnapshot>(initialFlight);
  useEffect(() => {
    const receiveState = (event: Event) => setFlight((event as CustomEvent<FlightSnapshot>).detail);
    window.addEventListener("tsukiharu-flight-state", receiveState);
    return () => window.removeEventListener("tsukiharu-flight-state", receiveState);
  }, []);

  const control = (action: FlightAction, pressed: boolean) => window.dispatchEvent(new CustomEvent("tsukiharu-flight-control", { detail: { action, pressed } }));
  const controlProps = (action: FlightAction) => ({ onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); control(action, true); }, onPointerUp: () => control(action, false), onPointerCancel: () => control(action, false), onPointerLeave: () => control(action, false) });
  const restart = () => window.dispatchEvent(new CustomEvent("tsukiharu-flight-command", { detail: "restart" }));

  return <TsukiLayout><section className="flight-page" aria-labelledby="flight-title"><header className="flight-page-heading"><p className="eyebrow">MINI GAME</p><h1 id="flight-title">Tsukiharu Landing</h1><p>方向と推力を操縦して、やさしく滑走路へ着陸してください。</p></header><div className="flight-stage" data-status={flight.status}><FlightGameCanvas /><div className="flight-hud" aria-live="polite"><div className="flight-hud-top"><span className={`flight-status status-${flight.status}`}>{statusLabels[flight.status]}</span><span>WIND 03 kt</span></div><div className="flight-instruments"><dl><div><dt>ALT</dt><dd>{Math.max(0, Math.round(flight.altitude * 100))}<small>m</small></dd></div><div><dt>SPD</dt><dd>{Math.round(flight.speed * 12)}<small>km/h</small></dd></div><div><dt>V/S</dt><dd>{Math.round(flight.verticalSpeed * 100)}<small>fpm</small></dd></div><div><dt>PITCH</dt><dd>{Math.round(flight.pitch * 57)}<small>°</small></dd></div></dl><div className="thrust-meter"><span>THRUST</span><i><b style={{ width: `${Math.round(flight.thrust * 100)}%` }} /></i></div></div><div className="flight-message"><strong>{flight.message}</strong>{flight.status === "landed" && <span>LANDING SCORE {flight.score}</span>}</div></div><div className="flight-controls" aria-label="飛行機のタッチ操作"><button type="button" {...controlProps("pitchUp")}>←<small>機首上げ</small></button><button type="button" {...controlProps("thrust")} className="flight-thrust">▲<small>推力</small></button><button type="button" {...controlProps("pitchDown")}>→<small>機首下げ</small></button><button type="button" onClick={restart} className="flight-restart"><RotateCcw size={15} /><small>リトライ</small></button></div></div><div className="flight-guide"><div><b>KEYBOARD</b><span>← 機首上げ　→ 機首下げ　Space 推力</span></div><div><b>LANDING</b><span>速度 96–276 km/h、機首 ±12°、ゆるやかな降下で接地</span></div><div><b>VIEW</b><span>第三者追従視点／滑走路進入HUD</span></div></div></section></TsukiLayout>;
}
