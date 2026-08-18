import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

export function TsukiLayout({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <main className="tsuki-page"><div className="tsuki-sky" aria-hidden="true" /><header className="tsuki-header tsuki-glass"><Link href="/" className="tsuki-brand"><img src="/manus-storage/tsukiharua-logo_ff6052f9.png" alt="月春の資材置き場" /><span>月春の資材置き場</span></Link><nav aria-label="メインナビゲーション"><Link href="/works">作品</Link><Link href="/library">本棚</Link><Link href="/photos">写真</Link><Link href="/blog">ノート</Link></nav><div className="tsuki-header-action">{action}<Link href="/admin" className="tsuki-owner-link"><Sparkles size={13} />owner</Link></div></header>{children}<footer className="tsuki-footer"><span>☾ 月春の資材置き場</span><span>private room archive</span></footer></main>;
}
