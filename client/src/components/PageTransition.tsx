import { useEffect } from "react";

const EXIT_DURATION_MS = 180;

export function canFadeNavigate(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
  url: URL
) {
  const current = new URL(window.location.href);
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !anchor.target &&
    !anchor.hasAttribute("download") &&
    !anchor.hasAttribute("data-page-transition-off") &&
    url.origin === window.location.origin &&
    url.href !== window.location.href &&
    (url.pathname !== current.pathname || url.search !== current.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function PageTransition() {
  useEffect(() => {
    document.documentElement.classList.remove("page-is-leaving");
    let navigationTimer: number | undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      if (!canFadeNavigate(event, anchor, url)) return;

      event.preventDefault();
      if (navigationTimer !== undefined) return;
      document.documentElement.classList.add("page-is-leaving");
      navigationTimer = window.setTimeout(
        () => window.location.assign(url.href),
        EXIT_DURATION_MS
      );
    };

    const clearLeavingState = () => {
      window.clearTimeout(navigationTimer);
      navigationTimer = undefined;
      document.documentElement.classList.remove("page-is-leaving");
    };
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", clearLeavingState);
    return () => {
      clearLeavingState();
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", clearLeavingState);
    };
  }, []);

  return null;
}
