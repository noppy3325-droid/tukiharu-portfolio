import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowUpRight, BookMarked, BriefcaseBusiness, Camera, LogIn, NotebookPen, Sparkles } from "lucide-react";
import { Link } from "wouter";

function formatDate(date: Date | string | null) {
  return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : "";
}

export default function Home() {
  const { user, loading } = useAuth();
  const works = trpc.content.works.list.useQuery();
  const books = trpc.content.books.list.useQuery();
  const gallery = trpc.content.gallery.list.useQuery();
  const notes = trpc.blog.list.useQuery();
  const workItems = works.data ?? [];
  const bookItems = books.data ?? [];
  const photoItems = gallery.data ?? [];
  const noteItems = notes.data ?? [];

  return <main className="simple-portfolio">
    <header className="simple-header"><Link href="/" className="simple-brand"><span>●</span> little room</Link><nav className="simple-nav" aria-label="ページ内ナビゲーション"><a href="#works">works</a><a href="#library">library</a><a href="#photos">photos</a><a href="#notes">notes</a></nav>{!loading && !user && <Button type="button" onClick={() => startLogin()} variant="ghost" className="simple-login"><LogIn size={15} />ログイン</Button>}</header>

    <section className="simple-hero"><div className="simple-hero-copy"><p className="simple-kicker"><Sparkles size={14} /> PERSONAL PORTFOLIO</p><h1>静かに、<br /><em>つくる。</em></h1><p className="simple-lead">つくったもの、好きな本、写真と言葉を、<br />気負わずに残していく小さなポートフォリオです。</p><div className="simple-hero-actions"><a href="#works" className="simple-primary-link">作品を見る <ArrowRight size={16} /></a><a href="#notes" className="simple-text-link">最近のノートへ</a></div></div><aside className="simple-profile-card" aria-label="ポートフォリオの概要"><span className="simple-profile-mark">LR</span><p>ABOUT THIS ROOM</p><strong>日常を観察して、<br />丁寧にかたちにする。</strong><div><span>{workItems.length}</span><small>WORKS</small><span>{noteItems.length}</span><small>NOTES</small></div></aside></section>

    <section id="works" className="simple-section"><div className="simple-section-heading"><div><p>01 / WORKS</p><h2>制作したもの</h2></div><BriefcaseBusiness aria-hidden="true" /></div><div className="simple-work-grid">{workItems.length ? workItems.map((work, index) => <article className="simple-work-card" key={work.id}><span>0{index + 1}</span><p>{work.category}</p><h3>{work.title}</h3><div><p>{work.summary}</p>{work.url && <a href={work.url} target="_blank" rel="noreferrer" aria-label={`${work.title}を開く`}><ArrowUpRight size={17} /></a>}</div></article>) : <p className="simple-empty">作品は準備中です。公開されると、ここに並びます。</p>}</div></section>

    <section id="library" className="simple-section simple-library-section"><div className="simple-section-heading"><div><p>02 / LIBRARY</p><h2>本棚の記録</h2></div><BookMarked aria-hidden="true" /></div><div className="simple-library-list">{bookItems.length ? bookItems.map((book, index) => <article key={book.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{book.title}</h3><p>{book.author}</p></div><p>{book.note}</p></article>) : <p className="simple-empty">お気に入りの本を選んでいます。</p>}</div></section>

    <section id="photos" className="simple-section"><div className="simple-section-heading"><div><p>03 / PHOTOS</p><h2>写真の記録</h2></div><Camera aria-hidden="true" /></div><div className="simple-photo-grid">{photoItems.length ? photoItems.map(item => <article className="simple-photo-card" key={item.id}><img src={item.imageUrl} alt={item.title} /><div><h3>{item.title}</h3><p>{[item.camera, item.lens, item.location, item.takenAt ? formatDate(item.takenAt) : null].filter(Boolean).join(" · ") || item.caption}</p></div></article>) : <p className="simple-empty">写真を選んでいます。しばらくお待ちください。</p>}</div></section>

    <section id="notes" className="simple-section"><div className="simple-section-heading"><div><p>04 / NOTES</p><h2>最近のノート</h2></div><NotebookPen aria-hidden="true" /></div><div className="simple-notes-list">{noteItems.length ? noteItems.slice(0, 4).map(post => <Link href={`/blog/${post.slug}`} className="simple-note-row" key={post.id}><time>{formatDate(post.publishedAt ?? post.createdAt)}</time><div><h3>{post.title}</h3><p>{post.excerpt}</p></div><ArrowUpRight size={18} /></Link>) : <p className="simple-empty">まだノートはありません。</p>}</div><Link href="/blog" className="simple-all-notes">すべてのノートを見る <ArrowRight size={16} /></Link></section>

    <footer className="simple-footer"><span>© little room</span><Link href="/admin">owner access</Link></footer>
  </main>;
}
