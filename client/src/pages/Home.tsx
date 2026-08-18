import { BookOpen, BriefcaseBusiness, Camera, Code2, LogIn, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TsukiLayout } from "@/components/TsukiLayout";
import { Link } from "wouter";

const shortcuts = [
  { href: "/works", label: "作品", icon: BriefcaseBusiness, className: "tsuki-shortcut-works" },
  { href: "/library", label: "本棚", icon: BookOpen, className: "tsuki-shortcut-library" },
  { href: "/photos", label: "写真", icon: Camera, className: "tsuki-shortcut-photos" },
  { href: "/blog", label: "ノート", icon: NotebookPen, className: "tsuki-shortcut-notes" },
];

export default function Home() {
  const { user, loading } = useAuth();
  return <TsukiLayout action={!loading && !user ? <Button type="button" onClick={() => startLogin()} variant="ghost" className="tsuki-owner-link"><LogIn size={13} />ログイン</Button> : undefined}><section className="tsuki-room-desktop" aria-label="月春の資材置き場"><aside className="tsuki-logo-widget tsuki-glass"><img src="/manus-storage/tsukiharua-logo_ff6052f9.png" alt="月春の資材置き場のイラスト" /><span>private archive</span></aside><aside className="tsuki-code-widget tsuki-glass" aria-label="HTMLエディタ"><div className="tsuki-code-bar"><span /><span /><span /><p><Code2 size={13} />index.html</p></div><pre><code><i>&lt;main&gt;</i>{"\n"}  <b>月春</b>{"\n"}  <em>資材置き場</em>{"\n"}<i>&lt;/main&gt;</i></code></pre><small>saved locally</small></aside><div className="tsuki-shortcuts" aria-label="コンテンツへのショートカット">{shortcuts.map(item => { const Icon = item.icon; return <Link href={item.href} className={`tsuki-shortcut tsuki-glass ${item.className}`} key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</div></section></TsukiLayout>;
}
