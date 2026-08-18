import { ArrowUpRight, BookOpenText, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Blog() {
  const posts = trpc.blog.list.useQuery();
  return <TsukiLayout><div className="simple-portfolio tsuki-notes-wrap"><section className="simple-blog-hero"><p className="simple-kicker"><Sparkles size={14} /> 04 / MOON NOTES</p><h1>春の夜の、<br className="tsuki-mobile-break" /><em>ことば。</em></h1><p>つくること、出会ったもの、考えたこと。<br />月明かりのそばで、少しずつ残しています。</p></section><section className="simple-blog-list">{posts.isLoading ? <p className="simple-empty">ノートを読み込んでいます。</p> : posts.data?.length ? posts.data.map((post, index) => <Link href={`/blog/${post.slug}`} className="simple-blog-row" key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><time><CalendarDays size={13} />{formatDate(post.publishedAt ?? post.createdAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p></div><ArrowUpRight size={18} /></Link>) : <div className="simple-blog-empty"><BookOpenText size={21} /><p>NO NOTES YET</p><h2>まだ、まっさらなノートです。</h2><span>最初の記事が公開されると、ここに並びます。</span></div>}</section></div></TsukiLayout>;
}
