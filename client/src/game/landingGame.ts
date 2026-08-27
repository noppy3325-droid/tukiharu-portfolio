export type FlightStatus = "ready" | "flying" | "landed" | "crashed";
export type FlightAction = "pitchUp" | "pitchDown" | "thrust";

export type FlightSnapshot = {
  status: FlightStatus;
  x: number;
  altitude: number;
  speed: number;
  verticalSpeed: number;
  pitch: number;
  thrust: number;
  score: number;
  message: string;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const runwayStart = -12;
const runwayEnd = 54;

export class LandingGame {
  private input: Record<FlightAction, boolean> = { pitchUp: false, pitchDown: false, thrust: false };
  private demoTime = 0;
  private state = this.initialState();

  constructor(private readonly demo = false) {}

  private initialState(): FlightSnapshot {
    return { status: "ready", x: -64, altitude: 18, speed: 15, verticalSpeed: -1.2, pitch: -0.05, thrust: 0, score: 0, message: "推力を入れて、滑走路へ進入してください。" };
  }

  setInput(action: FlightAction, pressed: boolean) {
    this.input[action] = pressed;
    if (pressed && this.state.status === "ready") {
      this.state.status = "flying";
      this.state.message = "進入中：速度と姿勢を整えてください。";
    }
  }

  reset() {
    this.input = { pitchUp: false, pitchDown: false, thrust: false };
    this.demoTime = 0;
    this.state = this.initialState();
  }

  getSnapshot(): FlightSnapshot {
    return { ...this.state };
  }

  update(deltaSeconds: number): FlightSnapshot {
    const dt = clamp(deltaSeconds, 0, 0.05);
    if (this.demo) return this.updateDemo(dt);
    if (this.state.status === "ready" || this.state.status === "crashed") return this.getSnapshot();
    if (this.state.status === "landed") {
      this.state.speed = Math.max(0, this.state.speed - 7 * dt);
      this.state.x += this.state.speed * dt;
      return this.getSnapshot();
    }

    const pitchControl = (this.input.pitchUp ? 1 : 0) - (this.input.pitchDown ? 1 : 0);
    this.state.pitch = clamp(this.state.pitch + pitchControl * 0.9 * dt, -0.55, 0.42);
    const targetThrust = this.input.thrust ? 1 : 0.28;
    this.state.thrust += (targetThrust - this.state.thrust) * Math.min(1, 3.2 * dt);

    const forwardAcceleration = 5.5 + this.state.thrust * 16;
    const lift = Math.max(0, this.state.speed) * (0.26 + Math.sin(this.state.pitch) * 0.34);
    this.state.speed = clamp(this.state.speed + (forwardAcceleration * Math.cos(this.state.pitch) - this.state.speed * 0.18) * dt, 0, 34);
    this.state.verticalSpeed += (forwardAcceleration * Math.sin(this.state.pitch) + lift - 8.7 - this.state.verticalSpeed * Math.abs(this.state.verticalSpeed) * 0.018) * dt;
    this.state.x += this.state.speed * dt;
    this.state.altitude += this.state.verticalSpeed * dt;

    if (this.state.altitude <= 0) this.resolveTouchdown();
    if (this.state.x > runwayEnd + 18 && this.state.status === "flying") this.crash("滑走路を通り過ぎました。推力を抑えて、もう一度。 ");
    return this.getSnapshot();
  }

  private resolveTouchdown() {
    const isOnRunway = this.state.x >= runwayStart && this.state.x <= runwayEnd;
    const isGentle = this.state.speed >= 8 && this.state.speed <= 23 && Math.abs(this.state.verticalSpeed) <= 4.3 && Math.abs(this.state.pitch) <= 0.22;
    this.state.altitude = 0;
    if (isOnRunway && isGentle) {
      this.state.status = "landed";
      this.state.score = Math.round(100 + (23 - this.state.speed) * 4 + (4.3 - Math.abs(this.state.verticalSpeed)) * 7);
      this.state.message = "着陸成功。滑走路をゆっくり走行中です。";
      return;
    }
    this.crash(isOnRunway ? "着地が強すぎます。速度と機首を整えてください。" : "滑走路の外へ着地しました。進入位置を合わせてください。");
  }

  private crash(message: string) {
    this.state.status = "crashed";
    this.state.speed = 0;
    this.state.verticalSpeed = 0;
    this.state.message = message;
  }

  private updateDemo(dt: number): FlightSnapshot {
    this.demoTime += dt;
    const progress = clamp(this.demoTime / 8, 0, 1);
    this.state.status = progress >= 1 ? "landed" : "flying";
    this.state.x = -64 + progress * 88;
    this.state.altitude = Math.max(0, 18 * (1 - progress) * (1 - progress));
    this.state.speed = progress >= 1 ? 8 : 15 - progress * 4;
    this.state.verticalSpeed = progress >= 1 ? 0 : -4.5 * (1 - progress);
    this.state.pitch = progress >= 1 ? 0 : -0.05 + progress * 0.05;
    this.state.thrust = progress >= 1 ? 0.15 : 0.34;
    this.state.score = progress >= 1 ? 184 : 0;
    this.state.message = progress >= 1 ? "自動進入：着陸成功。" : "自動進入デモを表示しています。";
    return this.getSnapshot();
  }
}

export const flightRunway = { start: runwayStart, end: runwayEnd };
