import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookHeart, Camera, ExternalLink, FileText, FolderHeart, Monitor, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type Work = { id: number; title: string; summary: string; category: string; url: string | null; accent: string };
type Book = { id: number; title: string; author: string; note: string; coverColor: string };
type GalleryItem = { id: number; title: string; caption: string; imageUrl: string; camera: string | null; lens: string | null; location: string | null; takenAt: Date | null; rotation: number };

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
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  return (
    <>
      <section className="desktop-stage" aria-label="クリックできるデスクトップ画面">
        <div className="desktop-menubar"><span className="desktop-brand"><Sparkles size={14} /> my quiet desktop</span><span>08 / 18 · slow morning</span></div>
        <div className="desktop-sky" aria-hidden="true"><i /><i /><i /></div>
        <div className="desktop-icons" aria-label="デスクトップのフォルダ">
          <button className="desktop-icon" onClick={() => setActiveDialog("works")}><span className="desktop-icon-art icon-work"><Monitor /></span><b>my works</b><small>ポートフォリオ</small></button>
          <button className="desktop-icon" onClick={() => setActiveDialog("books")}><span className="desktop-icon-art icon-book"><BookHeart /></span><b>little library</b><small>お気に入りの本</small></button>
          <button className="desktop-icon" onClick={() => setActiveDialog("gallery")}><span className="desktop-icon-art icon-photo"><Camera /></span><b>photo album</b><small>撮影の記録</small></button>
          <Link href="/blog" className="desktop-icon"><span className="desktop-icon-art icon-note"><FileText /></span><b>room notes</b><small>日々のノート</small></Link>
        </div>
        <div className="desktop-welcome-panel">
          <p className="desktop-eyebrow">WELCOME TO MY DESKTOP</p>
          <h2>わたしの、<br /><strong>ちいさな部屋。</strong></h2>
          <p>つくったもの、好きなことば、<br />とっておきの瞬間を、ここに。</p>
          <span className="desktop-panel-hint">左のアイコンから、気になるものをひらいてね。</span>
        </div>
        <div className="desktop-sticky"><span>today&apos;s note</span><b>ゆっくり、
        ひとつずつ。</b><i>✦</i></div>
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
          <div className="gallery-grid p-6">{gallery.length ? gallery.map(item => <button type="button" className={`polaroid ${selectedPhotoId === item.id ? "is-selected" : ""}`} key={item.id} style={{ transform: `rotate(${item.rotation}deg)` }} onClick={() => setSelectedPhotoId(selectedPhotoId === item.id ? null : item.id)} aria-pressed={selectedPhotoId === item.id}><img src={item.imageUrl} alt={item.title} /><span className="polaroid-caption"><strong>{item.title}</strong><span>{item.caption}</span><em>{[item.camera, item.lens, item.location, item.takenAt ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(item.takenAt)) : null].filter(Boolean).join(" · ") || "撮影メモはありません"}</em></span></button>) : <div className="col-span-full"><EmptyShelf>まだ写真はありません。<br />ここには、オーナーが追加したポラロイドが飾られます。</EmptyShelf></div>}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
