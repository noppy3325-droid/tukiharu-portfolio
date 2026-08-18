import { useEffect } from "react";

const EXIT_DURATION_MS = 180;

export function canFadeNavigate(event: MouseEvent, anchor: HTMLAnchorElement, url: URL) {
  return event.button === 0
    && !event.defaultPrevented
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && !anchor.target
    && !anchor.hasAttribute("download")
    && !anchor.dataset.pageTransitionOff
    && url.origin === window.location.origin
    && url.href !== window.location.href
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PageTransition() {
  useEffect(() => {
    document.documentElement.classList.remove("page-is-leaving");

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      if (!canFadeNavigate(event, anchor, url)) return;

      event.preventDefault();
      document.documentElement.classList.add("page-is-leaving");
      window.setTimeout(() => window.location.assign(url.href), EXIT_DURATION_MS);
    };

    const clearLeavingState = () => document.documentElement.classList.remove("page-is-leaving");
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", clearLeavingState);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", clearLeavingState);
    };
  }, []);

  return null;
}
