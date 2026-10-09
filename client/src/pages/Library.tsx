import { BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { PortfolioHeading } from "@/components/PortfolioHeading";

export default function Library() {
  const books = trpc.content.books.list.useQuery();
  return (
    <TsukiLayout>
      <PortfolioHeading
        eyebrow="LIBRARY / 読書の記録"
        title="本棚"
        description="読んだもの、心に残ったもの。本と読書のメモを並べています。"
      />
      <section className="tsuki-book-list" aria-label="本と読書のメモ">
        {books.isLoading ? (
          <p className="gallery-state" role="status">
            本棚を読み込んでいます。
          </p>
        ) : books.isError ? (
          <div className="tsuki-empty" role="alert">
            <p>本棚を取得できませんでした。</p>
            <button onClick={() => books.refetch()}>再読み込み</button>
          </div>
        ) : books.data?.length ? (
          books.data.map((book, index) => (
            <article
              className={`tsuki-glass${book.coverImageUrl ? " library-card-with-cover" : ""}`}
              key={book.id}
            >
              {book.coverImageUrl && (
                <img
                  className="library-cover"
                  src={book.coverImageUrl}
                  alt={`${book.title}の表紙`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{book.title}</h2>
                <small>{book.author}</small>
              </div>
              <p>{book.note}</p>
              <i aria-hidden="true">✦</i>
            </article>
          ))
        ) : (
          <div className="tsuki-empty tsuki-glass">
            <BookOpen size={25} />
            <p>お気に入りの本を選んでいます。</p>
          </div>
        )}
      </section>
    </TsukiLayout>
  );
}
