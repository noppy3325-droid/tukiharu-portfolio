import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TsukiLayout } from "@/components/TsukiLayout";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, BriefcaseBusiness, Camera, LogIn, NotebookPen, Sparkles } from "lucide-react";
import { Link } from "wouter";

const hubs = [
  { href: "/works", index: "01", title: "作品", text: "月の下で、つくったもの。", icon: BriefcaseBusiness },
  { href: "/library", index: "02", title: "本棚", text: "春の夜に、ひらいた本。", icon: BookOpen },
  { href: "/photos", index: "03", title: "写真", text: "光を集めた、アルバム。", icon: Camera },
  { href: "/blog", index: "04", title: "ノート", text: "静かなことばの記録。", icon: NotebookPen },
];

export default function Home() {
  const { user, loading } = useAuth();
  const works = trpc.content.works.list.useQuery();
  const notes = trpc.blog.list.useQuery();
  return <TsukiLayout action={!loading && !user ? <Button type="button" onClick={() => startLogin()} variant="ghost" className="tsuki-owner-link"><LogIn size={13} />ログイン</Button> : undefined}><section className="tsuki-hero"><div><p className="tsuki-eyebrow"><Sparkles size={14} /> TSUKIHARUA ARCHIVE</p><h1>月と春の<br /><em>あいだに。</em></h1><p>淡い光のなかで集めた、つくること、読むこと、写すこと。<br />月春の小さな資材置き場です。</p><div className="tsuki-hero-actions"><Link href="/works" className="tsuki-primary">作品を見る <ArrowRight size={16} /></Link><Link href="/blog" className="tsuki-secondary">最近のノートへ</Link></div></div><aside className="tsuki-orbit tsuki-glass"><div className="tsuki-moon" aria-hidden="true" /><p>UNDER THE SPRING MOON</p><strong>やわらかい光を、<br />すこしずつ集める。</strong><div><span>{works.data?.length ?? 0}</span><small>WORKS</small><span>{notes.data?.length ?? 0}</span><small>NOTES</small></div></aside></section><section className="tsuki-home-nav" aria-label="コンテンツページ"><h2 className="sr-only">コンテンツ</h2>{hubs.map(item => { const Icon = item.icon; return <Link href={item.href} className="tsuki-hub-card tsuki-glass" key={item.href}><span>{item.index}</span><Icon aria-hidden="true" /><h2>{item.title}</h2><p>{item.text}</p><b><ArrowRight size={17} /></b></Link>; })}</section><aside className="tsuki-quiet-note tsuki-glass"><span>✦ TSUKIHARUA</span><p>夜の青、春の薄紅、朝の水色。ページをひらくたび、色が静かに混ざり合います。</p></aside></TsukiLayout>;
}
