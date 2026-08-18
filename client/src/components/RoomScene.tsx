import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookHeart, Camera, ExternalLink, FolderHeart, Monitor, Sparkles } from "lucide-react";
import { useState } from "react";

type Work = { id: number; title: string; summary: string; category: string; url: string | null; accent: string };
type Book = { id: number; title: string; author: string; note: string; coverColor: string };
type GalleryItem = { id: number; title: string; caption: string; imageUrl: string; rotation: number };

type RoomSceneProps = {
  works: Work[];
  books: Book[];
  gallery: GalleryItem[];
};

type RoomDialog = "works" | "books" | "gallery" | null;

function EmptyShelf({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-[#d8b8b2] bg-[#fffaf0] px-5 py-9 text-center text-sm leading-7 text-[#795a55]">{children}</div>;
}

export default function RoomScene({ works, books, gallery }: RoomSceneProps) {
  const [activeDialog, setActiveDialog] = useState<RoomDialog>(null);

  return (
    <>
      <section className="room-stage" aria-label="クリックできるわたしの部屋">
        <div className="room-halo room-halo-one" />
        <div className="room-halo room-halo-two" />
        <div className="room-wallpaper"><span>✦</span><span>♡</span><span>✦</span><span>♡</span></div>

        <div className="poster-frame" aria-label="Mellow daysポスター">
          <span className="poster-sun">☼</span>
          <span>mellow<br />days</span>
        </div>

        <div className="window-scene" aria-hidden="true">
          <span className="cloud cloud-a" /><span className="cloud cloud-b" />
          <div className="window-cross" />
        </div>

        <div className="plant" aria-hidden="true"><span className="plant-leaf leaf-one" /><span className="plant-leaf leaf-two" /><span className="plant-leaf leaf-three" /><span className="plant-pot" /></div>

        <button className="room-object bookshelf object-bounce" onClick={() => setActiveDialog("books")} aria-label="本棚を開いておすすめ本を見る">
          <span className="object-label"><BookHeart size={15} />本棚をひらく</span>
          <span className="bookcase-top" />
          <span className="bookcase-inner"><i className="book book-pink" /><i className="book book-yellow" /><i className="book book-mint" /><i className="book book-lilac" /><b className="shelf-line shelf-one" /><i className="book book-peach book-low" /><i className="book book-blue book-low" /><i className="book book-rose book-low" /><b className="shelf-line shelf-two" /></span>
        </button>

        <button className="room-object camera object-bounce" onClick={() => setActiveDialog("gallery")} aria-label="カメラを開いて写真を見る">
          <span className="object-label"><Camera size={15} />写真を見る</span>
          <span className="camera-body"><span className="camera-flash" /><span className="camera-lens"><i /></span></span>
        </button>

        <div className="teddy" aria-label="くまのぬいぐるみ" role="img"><span className="teddy-ear ear-left" /><span className="teddy-ear ear-right" /><span className="teddy-head"><i className="teddy-eye eye-left" /><i className="teddy-eye eye-right" /><b className="teddy-nose" /></span><span className="teddy-body" /></div>

        <button className="room-object desk object-bounce" onClick={() => setActiveDialog("works")} aria-label="PCを開いて作品を見る">
          <span className="object-label"><Monitor size={15} />PCをひらく</span>
          <span className="desk-top" /><span className="desk-leg leg-left" /><span className="desk-leg leg-right" />
          <span className="monitor"><span className="monitor-screen"><i>hello!</i><b>✦</b><em>♡</em></span><span className="monitor-neck" /><span className="monitor-foot" /></span>
          <span className="desk-mug">♥</span>
          <span className="notebook" />
        </button>

        <div className="rug" aria-hidden="true"><span>⋆ ｡° ✩</span></div>
        <p className="room-hint"><Sparkles size={15} /> 気になるものを、そっとクリックしてね</p>
      </section>

      <Dialog open={activeDialog === "works"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="room-dialog max-h-[85vh] overflow-y-auto border-[#e9c2bf] bg-[#fffaf3] p-0 sm:max-w-2xl">
          <DialogHeader className="dialog-heading dialog-pink"><div className="dialog-icon"><FolderHeart /></div><DialogTitle>PCのなかの作品たち</DialogTitle><DialogDescription>つくったものを、ひとつずつ大切にしまっています。</DialogDescription></DialogHeader>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {works.length ? works.map(work => <article key={work.id} className={`work-card work-${work.accent}`}><span className="work-category">{work.category}</span><h3>{work.title}</h3><p>{work.summary}</p>{work.url && <a href={work.url} target="_blank" rel="noreferrer">見に行く <ExternalLink size={14} /></a>}</article>) : <div className="sm:col-span-2"><EmptyShelf>まだ作品をしまっていません。<br />オーナーが管理画面から追加すると、ここに並びます。</EmptyShelf></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "books"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="room-dialog max-h-[85vh] overflow-y-auto border-[#b8d9c9] bg-[#fbfff7] p-0 sm:max-w-xl">
          <DialogHeader className="dialog-heading dialog-mint"><div className="dialog-icon"><BookHeart /></div><DialogTitle>小さな本棚の、お気に入り</DialogTitle><DialogDescription>何度も手に取ってしまう、とっておきの本たちです。</DialogDescription></DialogHeader>
          <div className="space-y-3 p-5">{books.length ? books.map((book, index) => <article className="book-card" key={book.id}><div className={`book-cover cover-${book.coverColor}`}>{String(index + 1).padStart(2, "0")}</div><div><h3>{book.title}</h3><p className="book-author">{book.author}</p><p>{book.note}</p></div></article>) : <EmptyShelf>おすすめ本を準備中です。<br />気長に待っていてね。</EmptyShelf>}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "gallery"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="room-dialog max-h-[85vh] overflow-y-auto border-[#d9ca9d] bg-[#fffdf5] p-0 sm:max-w-3xl">
          <DialogHeader className="dialog-heading dialog-yellow"><div className="dialog-icon"><Camera /></div><DialogTitle>ポラロイドの思い出</DialogTitle><DialogDescription>光と空気を集めた、何気ない一瞬のアルバム。</DialogDescription></DialogHeader>
          <div className="gallery-grid p-6">{gallery.length ? gallery.map(item => <figure className="polaroid" key={item.id} style={{ transform: `rotate(${item.rotation}deg)` }}><img src={item.imageUrl} alt={item.title} /><figcaption><strong>{item.title}</strong><span>{item.caption}</span></figcaption></figure>) : <div className="col-span-full"><EmptyShelf>まだ写真はありません。<br />ここには、オーナーが追加したポラロイドが飾られます。</EmptyShelf></div>}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
