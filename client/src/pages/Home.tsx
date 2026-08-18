import RoomScene from "@/components/RoomScene";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookOpenText, LogIn, Settings2, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const works = trpc.content.works.list.useQuery();
  const books = trpc.content.books.list.useQuery();
  const gallery = trpc.content.gallery.list.useQuery();
  return <main className="home-page"><nav className="site-topbar"><Link href="/" className="brand"><span>✦</span> little room</Link><div className="nav-links"><Link href="/blog"><BookOpenText size={16} />ノート</Link>{user?.role === "admin" && <Link href="/admin"><Settings2 size={16} />管理する</Link>}{!loading && !user && <Button onClick={() => startLogin()} variant="ghost" className="nav-login"><LogIn size={16} />ログイン</Button>}</div></nav><section className="hero-copy container"><p className="eyebrow"><Sparkles size={15} /> MY TINY CORNER</p><h1>わたしの、<br /><em>ちいさな部屋。</em></h1><p>好きなものを並べて、つくったものを飾って、<br className="hidden sm:block" />今日の気分を、そっと残しておく場所。</p></section><div className="container room-container"><RoomScene works={works.data ?? []} books={books.data ?? []} gallery={gallery.data ?? []} /></div><section className="home-bottom container"><div><span>01</span><p>PCのなかには<br /><strong>つくったもの</strong>を。</p></div><div><span>02</span><p>本棚には<br /><strong>好きなことば</strong>を。</p></div><div><span>03</span><p>カメラには<br /><strong>とっておきの瞬間</strong>を。</p></div></section><footer className="site-footer">made with a little bit of daydreaming <span>♡</span></footer></main>;
}
