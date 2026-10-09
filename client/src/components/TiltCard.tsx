import type { HTMLAttributes } from "react";
export function tiltProperties(x: number, y: number) {
  return {
    "--mx": `${x * 100}%`,
    "--my": `${y * 100}%`,
    "--rx": `${(0.5 - y) * 5}deg`,
    "--ry": `${(x - 0.5) * 5}deg`,
  };
}
export function TiltCard({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <article
      {...props}
      className={`tilt-card ${className}`}
      onPointerMove={event => {
        if (
          event.pointerType !== "mouse" ||
          !matchMedia("(hover: hover) and (pointer: fine)").matches ||
          matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const box = event.currentTarget.getBoundingClientRect();
        const values = tiltProperties(
          Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
          Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
        );
        Object.entries(values).forEach(([key, value]) =>
          event.currentTarget.style.setProperty(key, value)
        );
      }}
      onPointerLeave={event => {
        Object.entries(tiltProperties(0.5, 0.5)).forEach(([key, value]) =>
          event.currentTarget.style.setProperty(key, value)
        );
      }}
    />
  );
}
