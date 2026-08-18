import type { ReactNode } from "react";

export function TsukiLayout({ children }: { children: ReactNode }) {
  return <main className="tsuki-page gallery-shell"><header className="gallery-header"><a href="/" className="gallery-brand"><strong>月春の資材置き場</strong><small>tsukiharu depot</small></a><nav aria-label="メインナビゲーション"><a href="/">Home</a><a href="/works">Works</a><a href="/photos">Gallery</a><a href="/blog">Blog</a><a href="/about">About</a></nav></header>{children}<footer className="gallery-footer"><span>© tsukiharu depot</span><a href="/admin">owner access</a></footer></main>;
}
