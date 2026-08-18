import { BookOpen, BriefcaseBusiness, Camera, Code2, LogIn, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TsukiLayout } from "@/components/TsukiLayout";
import { trpc } from "@/lib/trpc";
import { buildHomeUpdates } from "../lib/homeUpdates";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const shortcuts = [
  { href: "/works", label: "作品", icon: BriefcaseBusiness, className: "tsuki-shortcut-works" },
  { href: "/library", label: "本棚", icon: BookOpen, className: "tsuki-shortcut-library" },
  { href: "/photos", label: "写真", icon: Camera, className: "tsuki-shortcut-photos" },
  { href: "/blog", label: "ノート", icon: NotebookPen, className: "tsuki-shortcut-notes" },
];

const editorCode = "<main>\n  月春\n  資材置き場\n</main>";
function formatUpdateDate(value: Date | string) { return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date(value)); }

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
  const works = trpc.content.works.list.useQuery();
  const books = trpc.content.books.list.useQuery();
  const photos = trpc.content.gallery.list.useQuery();
  const notes = trpc.blog.list.useQuery();
  const updates = buildHomeUpdates([...(works.data ?? []).map(item => ({ label: "作品", title: item.title, updatedAt: item.updatedAt })), ...(books.data ?? []).map(item => ({ label: "本棚", title: item.title, updatedAt: item.updatedAt })), ...(photos.data ?? []).map(item => ({ label: "写真", title: item.title, updatedAt: item.updatedAt })), ...(notes.data ?? []).map(item => ({ label: "ノート", title: item.title, updatedAt: item.updatedAt }))]);
  const updatesLoading = works.isLoading || books.isLoading || photos.isLoading || notes.isLoading;
  const updatesError = works.isError || books.isError || photos.isError || notes.isError;
  return <TsukiLayout action={!loading && !user ? <Button type="button" onClick={() => startLogin()} variant="ghost" className="tsuki-owner-link"><LogIn size={13} />ログイン</Button> : undefined}><section className="tsuki-room-desktop" aria-label="月春の資材置き場"><aside className="tsuki-home-info"><section className="tsuki-profile-widget tsuki-glass"><p>ABOUT</p><h1>月春の資材置き場</h1><span>つくったものと、好きなものをまとめる個人のアーカイブです。</span></section><section className="tsuki-updates-widget tsuki-glass"><div><p>UPDATES</p><h2>最近の更新</h2></div>{updatesLoading ? <small className="tsuki-update-state">更新情報を読み込んでいます。</small> : updatesError ? <small className="tsuki-update-state">更新情報を取得できませんでした。</small> : updates.length ? <ul>{updates.slice(0, 3).map(update => <li key={`${update.label}-${update.title}`}><span>{formatUpdateDate(update.updatedAt)} · {update.label}</span><strong>{update.title}</strong></li>)}</ul> : <small className="tsuki-update-state">まだ公開コンテンツはありません。</small>}</section></aside><div className="tsuki-shortcuts" aria-label="コンテンツへのショートカット">{shortcuts.map(item => { const Icon = item.icon; return <Link href={item.href} className="tsuki-shortcut tsuki-glass" key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</div><aside className="tsuki-code-widget tsuki-glass" aria-label="HTMLエディタ"><div className="tsuki-code-bar"><span /><span /><span /><p><Code2 size={13} />index.html</p></div><TypingEditorCode /><small>saved locally</small></aside></section></TsukiLayout>;
}
