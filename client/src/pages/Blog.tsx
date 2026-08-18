import { ArrowLeft, ArrowUpRight, BookOpenText, CalendarDays, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date(date)) : ""; }

export default function Blog() {
  const posts = trpc.blog.list.useQuery();
  return <main className="min-h-screen page-paper"><div className="site-topbar compact"><Link href="/" className="brand"><span>✦</span> little room</Link><Link href="/" className="back-link"><ArrowLeft size={16} />部屋にもどる</Link></div><section className="blog-hero container"><p className="eyebrow"><BookOpenText size={15} /> ROOM NOTES</p><h1>ちいさな部屋の<br /><em>ことばたち。</em></h1><p>日々のこと、つくること、好きなもの。<br />少しずつ、ここに置いていきます。</p></section><section className="container pb-20"><div className="blog-grid">{posts.isLoading ? <p className="loading-copy">記事をならべています…</p> : posts.data?.length ? posts.data.map((post, index) => <article className={`post-card tone-${post.coverColor}`} key={post.id}><div className="post-number">0{index + 1}</div><p className="post-date"><CalendarDays size={14} />{formatDate(post.publishedAt ?? post.createdAt)}</p><h2>{post.title}</h2><p className="post-excerpt">{post.excerpt}</p><Link href={`/blog/${post.slug}`} className="post-link">続きを読む <ArrowUpRight size={17} /></Link></article>) : <div className="empty-notes"><div className="empty-note-scene" aria-hidden="true"><i className="paper paper-pink">✦</i><i className="paper paper-mint">♡</i><i className="paper paper-yellow">☼</i><b className="mini-pencil" /></div><div><span>☁</span><h2>まだ、まっさらなノートです。</h2><p>最初の記事が公開されると、この棚にそっと並びます。</p></div></div>}</div></section></main>;
}
