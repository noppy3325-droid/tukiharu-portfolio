import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import portfolioLogo from "@/assets/tsukiharu-logo.svg";

const navigationItems = [
  { href: "/", label: "Home", description: "作品と日々の記録をひとつに" },
  {
    href: "/works",
    label: "Works",
    description: "つくったものと制作の記録",
  },
  { href: "/photos", label: "Gallery", description: "写真で残した景色と瞬間" },
  { href: "/blog", label: "Blog", description: "考えたこと、日々の記録" },
  {
    href: "/library",
    label: "Library",
    description: "読んだ本と、心に残ったこと",
  },
  { href: "/about", label: "About", description: "月春について、好きなもの" },
];

export function TsukiLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const desktopNavigation = useRef<HTMLElement>(null);
  const isCurrent = (href: string) =>
    location === href || (href !== "/" && location.startsWith(`${href}/`));

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <main className="tsuki-page gallery-shell">
      <a
        className="portfolio-skip-link"
        href="#portfolio-content"
        data-page-transition-off
      >
        本文へ移動
      </a>
      <header className="gallery-header">
        <a href="/" data-page-transition-off className="gallery-brand">
          <img
            className="gallery-brand-logo"
            src={portfolioLogo}
            alt="月春の資材置き場"
            width={226}
            height={112}
            decoding="async"
          />
        </a>
        <nav
          ref={desktopNavigation}
          className="gallery-desktop-nav"
          aria-label="メインナビゲーション"
        >
          {navigationItems.map(item => (
            <a
              href={item.href}
              data-page-transition-off
              key={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="gallery-mobile-menu"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
              aria-controls="gallery-mobile-navigation"
            >
              <span
                className="menu-morph"
                data-open={menuOpen}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
              <span>MENU</span>
            </button>
          </SheetTrigger>
          <SheetContent
            id="gallery-mobile-navigation"
            side="right"
            className="gallery-mobile-sheet"
            onCloseAutoFocus={event => {
              if (!window.matchMedia("(min-width: 768px)").matches) return;
              const target =
                desktopNavigation.current?.querySelector<HTMLAnchorElement>(
                  'a[aria-current="page"]'
                ) ??
                desktopNavigation.current?.querySelector<HTMLAnchorElement>(
                  "a"
                );
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
          >
            <SheetHeader className="gallery-mobile-sheet-header">
              <p className="gallery-menu-kicker" aria-hidden="true">
                TSUKIHARU / PORTFOLIO
              </p>
              <SheetTitle className="gallery-menu-identity">
                月春の資材置き場
              </SheetTitle>
              <SheetDescription className="gallery-menu-caption">
                気になる場所から、どうぞ。
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              className="gallery-menu-close"
              onClick={() => setMenuOpen(false)}
              aria-label="メニューを閉じる"
            >
              <span className="menu-morph" data-open="true" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
            <nav className="gallery-mobile-nav" aria-label="モバイルメニュー">
              {navigationItems.map((item, index) => (
                <a
                  href={item.href}
                  className="gallery-mobile-link"
                  data-page-transition-off
                  onClick={() => setMenuOpen(false)}
                  key={item.href}
                  aria-label={item.label}
                  aria-describedby={`mobile-navigation-description-${index}`}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                >
                  <span
                    className="gallery-mobile-link-number"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="gallery-mobile-link-copy">
                    <span className="gallery-mobile-link-label">
                      {item.label}
                    </span>
                    <span
                      id={`mobile-navigation-description-${index}`}
                      className="gallery-mobile-link-description"
                    >
                      {item.description}
                    </span>
                  </span>
                  {isCurrent(item.href) ? (
                    <span
                      className="gallery-mobile-link-current"
                      aria-hidden="true"
                    >
                      現在地
                    </span>
                  ) : (
                    <ArrowRight
                      className="gallery-mobile-link-arrow"
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                </a>
              ))}
            </nav>
            <div className="gallery-menu-footer">
              <p className="gallery-menu-kicker">CONTACT</p>
              <a
                className="gallery-menu-contact"
                href="mailto:tukiharu3325+portfolio@gmail.com"
                onClick={() => setMenuOpen(false)}
              >
                <span>メールで連絡する</span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <p className="gallery-menu-caption">ご感想やご相談、お気軽に。</p>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <div id="portfolio-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="gallery-footer">
        <span>
          © tsukiharu depot{" "}
          <a
            href="https://github.com/noppy3325-droid/tukiharu-portfolio/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            README ↗
          </a>
        </span>
        <a href="/about" data-page-transition-off>
          About me
        </a>
      </footer>
    </main>
  );
}
