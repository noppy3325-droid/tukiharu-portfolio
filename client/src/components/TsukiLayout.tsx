import type { ReactNode } from "react";
import { Link } from "wouter";

export function TsukiLayout({ children }: { children: ReactNode }) {
  return <main className="tsuki-page gallery-shell"><header className="gallery-header"><Link href="/" className="gallery-brand"><strong>月春の資材置き場</strong><small>tsukiharu depot</small></Link><nav aria-label="メインナビゲーション"><Link href="/">Home</Link><Link href="/works">Works</Link><Link href="/photos">Gallery</Link><Link href="/blog">Blog</Link><Link href="/about">About</Link></nav></header>{children}<footer className="gallery-footer"><span>© tsukiharu depot</span><Link href="/admin">owner access</Link></footer></main>;
}
