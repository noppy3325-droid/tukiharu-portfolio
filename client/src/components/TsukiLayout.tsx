import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/works", label: "Works" },
  { href: "/photos", label: "Gallery" },
  { href: "/game", label: "Game" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function TsukiLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="tsuki-page gallery-shell"><header className="gallery-header"><a href="/" data-page-transition-off className="gallery-brand"><strong>月春の資材置き場</strong><small>tsukiharu depot</small></a><nav className="gallery-desktop-nav" aria-label="メインナビゲーション">{navigationItems.map(item => <a href={item.href} data-page-transition-off key={item.href}>{item.label}</a>)}</nav><Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><button type="button" className="gallery-mobile-menu" aria-label="メニューを開く" aria-expanded={menuOpen} aria-controls="gallery-mobile-navigation"><Menu size={19} /><span>MENU</span></button></SheetTrigger><SheetContent side="right" className="gallery-mobile-sheet"><SheetHeader><SheetTitle>メニュー</SheetTitle><SheetDescription>移動先を選択してください。</SheetDescription></SheetHeader><nav id="gallery-mobile-navigation" className="gallery-mobile-nav" aria-label="モバイルメニュー">{navigationItems.map(item => <a href={item.href} data-page-transition-off onClick={() => setMenuOpen(false)} key={item.href}>{item.label}</a>)}</nav></SheetContent></Sheet></header>{children}<footer className="gallery-footer"><span>© tsukiharu depot</span><a href="/admin" data-page-transition-off>owner access</a></footer></main>;
}
