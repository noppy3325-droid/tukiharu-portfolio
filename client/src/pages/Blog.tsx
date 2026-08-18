import { ArrowUpRight, BookOpenText, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getNotesDisplayState } from "@/lib/notes";
import { TsukiLayout } from "@/components/TsukiLayout";
import { useEffect, useState } from "react";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Blog() {
  const posts = trpc.blog.list.useQuery(undefined, { retry: false });
  const [isSlowLoad, setIsSlowLoad] = useState(false);
  useEffect(() => {
    if (!posts.isLoading) {
      setIsSlowLoad(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setIsSlowLoad(true), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [posts.isLoading]);
  const displayState = getNotesDisplayState({ isLoading: posts.isLoading, isSlow: isSlowLoad, isError: posts.isError, count: posts.data?.length });
  return <TsukiLayout><div className="simple-portfolio tsuki-notes-wrap"><section className="simple-blog-hero"><h1>ノート</h1></section><section className="simple-blog-list">{displayState === "loading" ? <p className="simple-empty">ノートを読み込んでいます。</p> : displayState === "slow" ? <div className="simple-empty" role="status"><p>ノートの読み込みに時間がかかっています。</p><button type="button" onClick={() => { setIsSlowLoad(false); void posts.refetch(); }}>もう一度読み込む</button></div> : displayState === "error" ? <div className="simple-empty" role="alert"><p>ノートを取得できませんでした。時間をおいてもう一度お試しください。</p><button type="button" onClick={() => void posts.refetch()}>もう一度読み込む</button></div> : displayState === "populated" ? posts.data?.map((post, index) => <Link href={`/blog/${post.slug}`} className="simple-blog-row" key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><time><CalendarDays size={13} />{formatDate(post.publishedAt ?? post.createdAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p></div><ArrowUpRight size={18} /></Link>) : <div className="simple-blog-empty"><BookOpenText size={21} /><p>NO NOTES YET</p><h2>まだ、まっさらなノートです。</h2><span>最初の記事が公開されると、ここに並びます。</span></div>}</section></div></TsukiLayout>;
}
