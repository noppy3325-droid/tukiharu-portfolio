import { ArrowUpRight, BookOpenText, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Blog() {
  const posts = trpc.blog.list.useQuery();
  return <TsukiLayout><div className="simple-portfolio tsuki-notes-wrap"><section className="simple-blog-hero"><h1>ノート</h1></section><section className="simple-blog-list">{posts.isLoading ? <p className="simple-empty">ノートを読み込んでいます。</p> : posts.data?.length ? posts.data.map((post, index) => <Link href={`/blog/${post.slug}`} className="simple-blog-row" key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><time><CalendarDays size={13} />{formatDate(post.publishedAt ?? post.createdAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p></div><ArrowUpRight size={18} /></Link>) : <div className="simple-blog-empty"><BookOpenText size={21} /><p>NO NOTES YET</p><h2>まだ、まっさらなノートです。</h2><span>最初の記事が公開されると、ここに並びます。</span></div>}</section></div></TsukiLayout>;
}
