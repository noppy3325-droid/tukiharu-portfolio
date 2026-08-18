import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpenText, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Blog() {
  const posts = trpc.blog.list.useQuery();
  return <main className="simple-portfolio"><header className="simple-header"><Link href="/" className="simple-brand"><span>●</span> little room</Link><Link href="/" className="simple-return"><ArrowLeft size={15} />portfolio</Link></header><section className="simple-blog-hero"><p className="simple-kicker"><BookOpenText size={14} /> ROOM NOTES</p><h1>日々の、<em>記録。</em></h1><p>つくること、出会ったもの、考えたこと。<br />静かなノートに少しずつ残しています。</p></section><section className="simple-blog-list">{posts.isLoading ? <p className="simple-empty">ノートを読み込んでいます。</p> : posts.data?.length ? posts.data.map((post, index) => <Link href={`/blog/${post.slug}`} className="simple-blog-row" key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><time><CalendarDays size={13} />{formatDate(post.publishedAt ?? post.createdAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p></div><ArrowUpRight size={18} /></Link>) : <div className="simple-blog-empty"><p>NO NOTES YET</p><h2>まだ、まっさらなノートです。</h2><span>最初の記事が公開されると、ここに並びます。</span></div>}</section><footer className="simple-footer"><span>© little room</span><Link href="/admin">owner access</Link></footer></main>;
}
