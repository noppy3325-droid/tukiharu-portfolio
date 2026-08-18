import { BookOpen, BriefcaseBusiness, Camera, Code2, LogIn, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TsukiLayout } from "@/components/TsukiLayout";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const shortcuts = [
  { href: "/works", label: "作品", icon: BriefcaseBusiness, className: "tsuki-shortcut-works" },
  { href: "/library", label: "本棚", icon: BookOpen, className: "tsuki-shortcut-library" },
  { href: "/photos", label: "写真", icon: Camera, className: "tsuki-shortcut-photos" },
  { href: "/blog", label: "ノート", icon: NotebookPen, className: "tsuki-shortcut-notes" },
];

const editorCode = "<main>\n  月春\n  資材置き場\n</main>";

function TypingEditorCode() {
  const [visibleLength, setVisibleLength] = useState(0);
  useEffect(() => {
    let timeout: number;
    const tick = () => setVisibleLength(current => {
      if (current < editorCode.length) { timeout = window.setTimeout(tick, 62); return current + 1; }
      timeout = window.setTimeout(() => { setVisibleLength(0); timeout = window.setTimeout(tick, 420); }, 2600);
      return current;
    });
    timeout = window.setTimeout(tick, 430);
    return () => window.clearTimeout(timeout);
  }, []);
  const displayed = editorCode.slice(0, visibleLength).split("\n");
  return <pre aria-label="月春のHTMLコードを入力中"><code>{displayed.map((line, index) => <span className="tsuki-code-line" key={index}>{line.startsWith("<") ? <i>{line}</i> : line.includes("月春") ? <b>{line}</b> : line.includes("資材置き場") ? <em>{line}</em> : line}{index < displayed.length - 1 && "\n"}</span>)}<span className="tsuki-code-cursor" aria-hidden="true" /></code></pre>;
}

export default function Home() {
  const { user, loading } = useAuth();
  return <TsukiLayout action={!loading && !user ? <Button type="button" onClick={() => startLogin()} variant="ghost" className="tsuki-owner-link"><LogIn size={13} />ログイン</Button> : undefined}><section className="tsuki-room-desktop" aria-label="月春の資材置き場"><div className="tsuki-shortcuts" aria-label="コンテンツへのショートカット">{shortcuts.map(item => { const Icon = item.icon; return <Link href={item.href} className="tsuki-shortcut tsuki-glass" key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</div><aside className="tsuki-code-widget tsuki-glass" aria-label="HTMLエディタ"><div className="tsuki-code-bar"><span /><span /><span /><p><Code2 size={13} />index.html</p></div><TypingEditorCode /><small>saved locally</small></aside></section></TsukiLayout>;
}
