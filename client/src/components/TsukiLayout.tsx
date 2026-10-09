import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/works", label: "Works" },
  { href: "/photos", label: "Gallery" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function TsukiLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const isCurrent = (href: string) =>
    location === href || (href !== "/" && location.startsWith(`${href}/`));
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
          <strong>月春の資材置き場</strong>
          <small>tsukiharu depot</small>
        </a>
        <nav className="gallery-desktop-nav" aria-label="メインナビゲーション">
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
          <SheetContent side="right" className="gallery-mobile-sheet">
            <SheetHeader>
              <SheetTitle>メニュー</SheetTitle>
              <SheetDescription>移動先を選択してください。</SheetDescription>
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
            <nav
              id="gallery-mobile-navigation"
              className="gallery-mobile-nav"
              aria-label="モバイルメニュー"
            >
              {navigationItems.map(item => (
                <a
                  href={item.href}
                  data-page-transition-off
                  onClick={() => setMenuOpen(false)}
                  key={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
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
