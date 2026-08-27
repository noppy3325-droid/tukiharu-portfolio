import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { LandingGame, type FlightAction, type FlightSnapshot, flightRunway } from "./landingGame";

const airplaneSpriteUrl = "/manus-storage/tsukiharu-flight-airplane-sprite_dcf3986b.png";

export type GameHandle = { scene: Scene; dispose: () => void };

function material(scene: Scene, name: string, color: Color3, alpha = 1) {
  const value = new StandardMaterial(name, scene);
  value.disableLighting = true;
  value.emissiveColor = color;
  value.alpha = alpha;
  value.backFaceCulling = false;
  return value;
}

function makePixelFallback(scene: Scene) {
  const texture = new DynamicTexture("pixel-airplane-fallback", { width: 240, height: 120 }, scene, false);
  const context = texture.getContext() as CanvasRenderingContext2D;
  context.clearRect(0, 0, 240, 120);
  context.fillStyle = "#183e50";
  context.fillRect(34, 48, 144, 24);
  context.fillRect(84, 30, 34, 18);
  context.fillRect(82, 72, 42, 18);
  context.fillRect(25, 40, 28, 40);
  context.fillStyle = "#fffaf0";
  context.fillRect(42, 52, 128, 16);
  context.fillRect(88, 34, 25, 14);
  context.fillRect(85, 72, 35, 14);
  context.fillStyle = "#a7d9e8";
  context.fillRect(132, 52, 30, 16);
  context.fillStyle = "#eebcc9";
  context.fillRect(44, 52, 22, 16);
  context.fillStyle = "#e8f7fb";
  context.fillRect(18, 48, 7, 24);
  context.imageSmoothingEnabled = false;
  texture.update(false);
  texture.hasAlpha = true;
  return texture;
}

function createCloud(scene: Scene, name: string, x: number, y: number, size: number, alpha: number) {
  const cloud = MeshBuilder.CreatePlane(name, { width: size, height: size * 0.3 }, scene);
  cloud.position.set(x, y, 2.8);
  cloud.material = material(scene, `${name}-material`, new Color3(0.98, 1, 1), alpha);
  return cloud;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.76, 0.91, 0.95, 1);
  const demo = new URLSearchParams(window.location.search).has("demo");
  const game = new LandingGame(demo);

  const camera = new FreeCamera("third-person-follow-camera", new Vector3(0, 0, -30), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(new Vector3(0, 0, 0));

  const sky = MeshBuilder.CreatePlane("soft-sky", { width: 800, height: 100 }, scene);
  sky.position.z = 4;
  sky.material = material(scene, "sky-material", new Color3(0.76, 0.91, 0.95));
  const horizon = MeshBuilder.CreatePlane("pink-horizon", { width: 800, height: 11 }, scene);
  horizon.position.set(0, -0.4, 3.5);
  horizon.material = material(scene, "horizon-material", new Color3(0.98, 0.89, 0.91), 0.86);
  createCloud(scene, "cloud-a", -58, 14, 18, 0.65);
  createCloud(scene, "cloud-b", -13, 10, 13, 0.55);
  createCloud(scene, "cloud-c", 34, 15, 22, 0.65);
  createCloud(scene, "cloud-d", 80, 9, 15, 0.5);

  const ground = MeshBuilder.CreatePlane("runway-grass", { width: 800, height: 10 }, scene);
  ground.position.set(0, -10, 2);
  ground.material = material(scene, "grass-material", new Color3(0.63, 0.79, 0.71));
  const runway = MeshBuilder.CreatePlane("runway", { width: flightRunway.end - flightRunway.start, height: 2.2 }, scene);
  runway.position.set((flightRunway.start + flightRunway.end) / 2, -0.9, 1.4);
  runway.material = material(scene, "runway-material", new Color3(0.34, 0.53, 0.58));
  for (let x = flightRunway.start + 5; x < flightRunway.end - 2; x += 10) {
    const marker = MeshBuilder.CreatePlane(`runway-marker-${x}`, { width: 4, height: 0.3 }, scene);
    marker.position.set(x, -0.9, 1.2);
    marker.material = material(scene, `runway-marker-material-${x}`, new Color3(0.98, 0.99, 0.91));
  }

  const airplane = MeshBuilder.CreatePlane("airplane", { width: 7, height: 3.5 }, scene);
  airplane.position.z = 0;
  const airplaneMaterial = material(scene, "airplane-material", new Color3(1, 1, 1));
  const generatedSprite = new Texture(airplaneSpriteUrl, scene, true, false, Texture.NEAREST_SAMPLINGMODE, undefined, () => { airplaneMaterial.diffuseTexture = makePixelFallback(scene); });
  generatedSprite.hasAlpha = true;
  airplaneMaterial.diffuseTexture = generatedSprite;
  airplaneMaterial.useAlphaFromDiffuseTexture = true;
  airplaneMaterial.emissiveColor = new Color3(0.96, 0.98, 1);
  airplane.material = airplaneMaterial;

  let lastHudAt = 0;
  const emitSnapshot = (snapshot: FlightSnapshot) => {
    const now = performance.now();
    if (now - lastHudAt < 80) return;
    lastHudAt = now;
    window.dispatchEvent(new CustomEvent<FlightSnapshot>("tsukiharu-flight-state", { detail: snapshot }));
  };
  const updateCamera = (snapshot: FlightSnapshot) => {
    const aspect = Math.max(1, engine.getRenderWidth() / Math.max(1, engine.getRenderHeight()));
    const halfHeight = 17;
    const targetX = snapshot.x + 4;
    camera.orthoTop = halfHeight + 6;
    camera.orthoBottom = -halfHeight + 6;
    camera.orthoLeft = -halfHeight * aspect;
    camera.orthoRight = halfHeight * aspect;
    camera.position.set(targetX, 6, -30);
    camera.setTarget(new Vector3(targetX, 6, 0));
  };

  const onControl = (event: Event) => {
    const detail = (event as CustomEvent<{ action: FlightAction; pressed: boolean }>).detail;
    if (detail?.action) game.setInput(detail.action, detail.pressed);
  };
  const onCommand = (event: Event) => {
    if ((event as CustomEvent<string>).detail === "restart") game.reset();
  };
  const keyToAction: Record<string, FlightAction | undefined> = { ArrowLeft: "pitchUp", ArrowRight: "pitchDown", " ": "thrust" };
  const onKeyDown = (event: KeyboardEvent) => {
    const action = keyToAction[event.key];
    if (!action) return;
    event.preventDefault();
    game.setInput(action, true);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const action = keyToAction[event.key];
    if (!action) return;
    event.preventDefault();
    game.setInput(action, false);
  };
  window.addEventListener("tsukiharu-flight-control", onControl);
  window.addEventListener("tsukiharu-flight-command", onCommand);
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: false });

  scene.onBeforeRenderObservable.add(() => {
    const snapshot = game.update(scene.getEngine().getDeltaTime() / 1000);
    airplane.position.set(snapshot.x, snapshot.altitude + 1.6, 0);
    airplane.rotation.z = snapshot.pitch;
    updateCamera(snapshot);
    emitSnapshot(snapshot);
  });
  emitSnapshot(game.getSnapshot());

  return { scene, dispose: () => {
    window.removeEventListener("tsukiharu-flight-control", onControl);
    window.removeEventListener("tsukiharu-flight-command", onCommand);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    scene.dispose();
    canvas.blur();
  } };
}
