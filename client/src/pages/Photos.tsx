import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { hasGalleryDetails } from "@/lib/galleryDetails";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Photos() {
  const photos = trpc.content.gallery.list.useQuery(undefined, { retry: false, staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: [] });
  const visiblePhotos = photos.data ?? [];
  const [selectedPhoto, setSelectedPhoto] = useState<(typeof visiblePhotos)[number] | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const preventImageSave = (event: React.SyntheticEvent) => event.preventDefault();

  useEffect(() => {
    if (!selectedPhoto) return;
    const preventSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") event.preventDefault();
    };
    window.addEventListener("keydown", preventSaveShortcut, true);
    return () => window.removeEventListener("keydown", preventSaveShortcut, true);
  }, [selectedPhoto]);

  return <TsukiLayout><section className="tsuki-subhero"><h1>Gallery</h1></section><section className="tsuki-photo-list">{photos.isError ? <div className="tsuki-empty tsuki-glass" role="alert"><Camera size={25} /><p>Galleryを取得できませんでした。ページを再読み込みしてください。</p><button type="button" onClick={() => window.location.reload()}>ページを再読み込み</button></div> : visiblePhotos.length ? visiblePhotos.map(photo => <article className="tsuki-glass" key={photo.id}><button type="button" className="tsuki-gallery-image-trigger" onClick={event => { photoTriggerRef.current = event.currentTarget; setSelectedPhoto(photo); }} aria-label={`${photo.title}を拡大表示`}><img src={photo.imageUrl} alt={photo.title} draggable={false} onContextMenu={preventImageSave} onDragStart={preventImageSave} /></button><div><h2>{photo.title}</h2><p>{photo.caption}</p>{hasGalleryDetails(photo) && <small>{[photo.camera, photo.lens, photo.location, formatDate(photo.takenAt)].filter(Boolean).join(" · ")}</small>}</div></article>) : <div className="tsuki-empty tsuki-glass"><Camera size={25} /><p>GALLERY IS EMPTY</p></div>}</section><Dialog open={Boolean(selectedPhoto)} onOpenChange={open => { if (!open) setSelectedPhoto(null); }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); photoTriggerRef.current?.focus(); }} className="tsuki-gallery-image-dialog" onContextMenu={preventImageSave}><DialogTitle className="sr-only">{selectedPhoto?.title ?? "画像の拡大表示"}</DialogTitle><DialogDescription className="sr-only">Escapeキー、閉じるボタン、または背景を選択すると拡大表示を閉じます。</DialogDescription>{selectedPhoto && <><div className="tsuki-gallery-image-viewer"><img src={selectedPhoto.imageUrl} alt={selectedPhoto.title} draggable={false} onContextMenu={preventImageSave} onDragStart={preventImageSave} /></div><div className="tsuki-gallery-image-caption"><strong>{selectedPhoto.title}</strong><span>{selectedPhoto.caption}</span></div></>}</DialogContent></Dialog></TsukiLayout>;
}
