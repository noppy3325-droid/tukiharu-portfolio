import { useEffect, useState } from "react";
import { millisecondsUntilNextMinute } from "@/lib/sekkiColors";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useFluxClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const date = new Date();
      setNow(date);
      timer = setTimeout(update, millisecondsUntilNextMinute(date));
    };
    const visible = () => {
      if (!document.hidden) update();
    };
    update();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", update);
    };
  }, []);
  return now;
}

export function useCrossfade<T>(value: T, duration: number, reduced: boolean) {
  const [pair, setPair] = useState<{
    current: T;
    previous: T | null;
    changed: boolean;
  }>({ current: value, previous: null, changed: false });
  useEffect(() => {
    setPair(previous =>
      Object.is(previous.current, value)
        ? reduced && previous.previous !== null
          ? { ...previous, previous: null }
          : previous
        : {
            current: value,
            previous: reduced ? null : previous.current,
            changed: true,
          }
    );
  }, [value, reduced]);
  useEffect(() => {
    if (reduced || pair.previous === null) return;
    const timer = setTimeout(
      () => setPair(previous => ({ ...previous, previous: null })),
      duration
    );
    return () => clearTimeout(timer);
  }, [pair.previous, duration, reduced]);
  return pair;
}
