import { BookOpen, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

export default function Library() {
  const books = trpc.content.books.list.useQuery();
  return <TsukiLayout><section className="tsuki-subhero"><p><Sparkles size={14} /> 02 / LIBRARY</p><h1>春の夜に<br /><em>ひらいた本。</em></h1><span>読み返すたびに、違う光を見つける本棚の記録です。</span></section><section className="tsuki-book-list">{books.data?.length ? books.data.map((book, index) => <article className="tsuki-glass" key={book.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{book.title}</h2><small>{book.author}</small></div><p>{book.note}</p><i aria-hidden="true">✦</i></article>) : <div className="tsuki-empty tsuki-glass"><BookOpen size={25} /><p>お気に入りの本を選んでいます。</p></div>}</section></TsukiLayout>;
}
