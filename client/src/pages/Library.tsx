import { BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

export default function Library() {
  const books = trpc.content.books.list.useQuery();
  return <TsukiLayout><section className="tsuki-subhero"><h1>本棚</h1></section><section className="tsuki-book-list">{books.data?.length ? books.data.map((book, index) => <article className={`tsuki-glass${book.coverImageUrl ? " library-card-with-cover" : ""}`} key={book.id}>{book.coverImageUrl && <img className="library-cover" src={book.coverImageUrl} alt={`${book.title}の表紙`} />}<span>{String(index + 1).padStart(2, "0")}</span><div><h2>{book.title}</h2><small>{book.author}</small></div><p>{book.note}</p><i aria-hidden="true">✦</i></article>) : <div className="tsuki-empty tsuki-glass"><BookOpen size={25} /><p>お気に入りの本を選んでいます。</p></div>}</section></TsukiLayout>;
}
