export const navigationItems = [
  { href: "/", label: "Home", description: "作品と日々の記録をひとつに" },
  { href: "/works", label: "Works", description: "つくったものと制作の記録" },
  { href: "/photos", label: "Gallery", description: "写真で残した景色と瞬間" },
  { href: "/blog", label: "Blog", description: "考えたこと、日々の記録" },
  { href: "/about", label: "About", description: "月春について、好きなもの" },
  { href: "/flux", label: "Flux", description: "時刻と季節の色" },
] as const;

export function isNavigationCurrent(path: string, href: string) {
  return path === href || (href !== "/" && path.startsWith(`${href}/`));
}

export function getNavigationItem(path: string) {
  return navigationItems.find(item => isNavigationCurrent(path, item.href));
}

export function getPageTitle(path: string, locale: "ja" | "en"): string | null {
  // Home SEO and the profile's name are supplied by their owning pages.
  if (path === "/" || path === "/about") return null;
  if (path === "/flux") return "Flux — いまの色";
  const label =
    getNavigationItem(path)?.label ??
    (path === "/visitor"
      ? locale === "ja"
        ? "コメントに使う名前"
        : "Comment name"
      : "404");
  return locale === "ja"
    ? `${label}｜月春の資材置き場`
    : `${label} | Tsukiharu Depot`;
}
