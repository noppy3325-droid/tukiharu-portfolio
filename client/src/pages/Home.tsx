import RoomScene from "@/components/RoomScene";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LogIn } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const works = trpc.content.works.list.useQuery();
  const books = trpc.content.books.list.useQuery();
  const gallery = trpc.content.gallery.list.useQuery();
  return <main className="home-page desktop-home"><nav className="site-topbar"><Link href="/" className="brand"><span>✦</span> little room</Link>{!loading && !user && <div className="nav-links"><Button onClick={() => startLogin()} variant="ghost" className="nav-login"><LogIn size={16} />ログイン</Button></div>}</nav><div className="container desktop-room-container"><RoomScene works={works.data ?? []} books={books.data ?? []} gallery={gallery.data ?? []} /></div><section className="home-bottom container"><div><span>01</span><p>デスクトップには<br /><strong>つくったもの</strong>を。</p></div><div><span>02</span><p>フォルダには<br /><strong>好きなことば</strong>を。</p></div><div><span>03</span><p>アルバムには<br /><strong>とっておきの瞬間</strong>を。</p></div></section><footer className="site-footer">made with a little bit of daydreaming <span>♡</span><Link href="/admin" className="admin-footer-link">owner access</Link></footer></main>;
}
