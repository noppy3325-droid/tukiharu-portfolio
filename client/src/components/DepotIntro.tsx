import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import "./depot-intro.css";

const assetRoot = "../assets/depot-intro/";
type Scene = {
  width: number;
  height: number;
  screen: { x: number; y: number; w: number; h: number };
  pivot: { x: number; y: number };
  room: string;
  desk: string;
  monitor: string;
  character: string;
};
const manifests = import.meta.glob<Scene>(
  "../assets/depot-intro/{landscape,portrait}.json",
  { eager: true, import: "default" }
);
const images = import.meta.glob<string>("../assets/depot-intro/*.{webp,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

export function DepotIntro() {
  const [pathname] = useLocation();
  const entryPath = useRef(pathname);
  const [playing, setPlaying] = useState<Scene | null>(null);
  const cancel = useRef<(() => void) | undefined>(undefined);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    // Each document entry is independent. Reload/history and same-origin links
    // are site navigation, even when the document's referrer is still external.
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation?.type === "reload" || navigation?.type === "back_forward") return;
    if (document.referrer) {
      try {
        if (new URL(document.referrer).origin === location.origin) return;
      } catch {
        // An unavailable referrer is treated like opening the URL directly.
      }
    }

    const variant = matchMedia("(min-width: 768px), (orientation: landscape)")
      .matches
      ? "landscape"
      : "portrait";
    const manifest = manifests[assetRoot + variant + ".json"];
    if (!manifest?.screen) return;
    const { x, y, w, h } = manifest.screen;
    if (
      !(
        manifest.width > 0 &&
        manifest.height > 0 &&
        x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= 100 &&
        y + h <= 100
      )
    )
      return;
    const scene = {
      ...manifest,
      room: images[assetRoot + manifest.room],
      desk: images[assetRoot + manifest.desk],
      monitor: images[assetRoot + manifest.monitor],
      character: images[assetRoot + manifest.character],
    };
    const urls = [scene.room, scene.desk, scene.monitor, scene.character];
    if (urls.some(url => !url)) return;

    let active = true;
    let deadline: number | undefined;
    let end: number | undefined;
    const root = document.documentElement;
    const stop = () => {
      active = false;
      clearTimeout(deadline);
      clearTimeout(end);
      root.classList.remove("depot-intro-active");
      motion.removeEventListener("change", stop);
      cancel.current = undefined;
      setPlaying(null);
    };
    cancel.current = stop;
    deadline = window.setTimeout(stop, 1200);
    motion.addEventListener("change", stop);

    Promise.all(
      urls.map(url => {
        const img = new Image();
        img.src = url;
        return img.decode();
      })
    )
      .then(() => {
        if (!active || motion.matches) return;
        clearTimeout(deadline);
        root.classList.add("depot-intro-active", "depot-intro-played");
        setPlaying(scene);
        end = window.setTimeout(stop, 3200);
      })
      .catch(() => {
        if (active) stop();
      });

    return () => {
      stop();
      root.classList.remove("depot-intro-active", "depot-intro-played");
    };
  }, []);

  useEffect(() => {
    if (pathname === entryPath.current) return;
    cancel.current?.();
    document.documentElement.classList.remove("depot-intro-played");
  }, [pathname]);

  useEffect(() => {
    const stage = frame.current;
    if (!playing || !stage) return;
    const { x, y, w, h } = playing.screen;
    const update = () => {
      const ratio = Math.min(
        innerWidth / playing.width,
        innerHeight / playing.height
      );
      const width = playing.width * ratio;
      const height = playing.height * ratio;
      stage.style.setProperty("--scene-width", `${width}px`);
      stage.style.setProperty("--scene-height", `${height}px`);
      stage.style.setProperty(
        "--screen-dx",
        `${width * (0.5 - (x + w / 2) / 100)}px`
      );
      stage.style.setProperty(
        "--screen-dy",
        `${height * (0.5 - (y + h / 2) / 100)}px`
      );
      stage.style.setProperty(
        "--screen-zoom",
        String(
          1.08 *
            Math.max(
              innerWidth / ((width * w) / 100),
              innerHeight / ((height * h) / 100)
            )
        )
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [playing]);

  if (!playing) return null;
  const { x, y, w, h } = playing.screen;
  return createPortal(
    <div className="depot-intro" aria-hidden="true">
      <div className="depot-intro-art" aria-hidden="true">
        <div
          className="depot-intro-frame"
          ref={frame}
          style={
            {
              "--screen-origin": `${x + w / 2}% ${y + h / 2}%`,
            } as CSSProperties
          }
        >
          <img src={playing.room} alt="" />
          <img src={playing.desk} alt="" />
          <div
            className="depot-intro-monitor-light"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
            }}
          />
          <img src={playing.monitor} alt="" />
          <img
            className="depot-intro-character"
            src={playing.character}
            alt=""
            style={{ transformOrigin: `${playing.pivot.x}% ${playing.pivot.y}%` }}
          />
        </div>
        <div className="depot-intro-cover" />
      </div>
    </div>,
    document.body
  );
}
