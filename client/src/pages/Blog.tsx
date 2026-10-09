import { ArrowUpRight, BookOpenText, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { PortfolioHeading } from "@/components/PortfolioHeading";

function formatDate(date: Date | string | null) {
  return date
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
        new Date(date)
      )
    : "";
}

export default function Blog() {
  const posts = trpc.blog.list.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
  const visiblePosts = posts.data ?? [];
  return (
    <TsukiLayout>
      <div className="simple-portfolio tsuki-notes-wrap">
        <PortfolioHeading
          className="simple-blog-hero"
          eyebrow="BLOG / 日々の記録"
          title="Blog"
          description="考えたこと、試したこと。日々の気づきを言葉で残しています。"
        />
        <section className="simple-blog-list">
          {posts.isError ? (
            <div className="simple-empty" role="alert">
              <p>
                Blogを取得できませんでした。時間をおいてもう一度お試しください。
              </p>
              <button type="button" onClick={() => window.location.reload()}>
                ページを再読み込み
              </button>
            </div>
          ) : visiblePosts.length ? (
            visiblePosts.map((post, index) => (
              <a
                href={`/blog/${post.slug}`}
                className="simple-blog-row"
                key={post.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <time>
                  <CalendarDays size={13} aria-hidden="true" />
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </time>
                <div>
                  <h2>{post.title}</h2>
                  <p>{post.excerpt}</p>
                </div>
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            ))
          ) : (
            <div className="simple-blog-empty">
              <BookOpenText size={21} />
              <p>NO BLOG POSTS YET</p>
              <h2>まだ記事はありません。</h2>
              <span>最初のBlog記事が公開されると、ここに並びます。</span>
            </div>
          )}
        </section>
      </div>
    </TsukiLayout>
  );
}
