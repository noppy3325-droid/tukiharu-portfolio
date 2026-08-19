import { Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { hasGalleryDetails } from "@/lib/galleryDetails";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Photos() {
  const photos = trpc.content.gallery.list.useQuery(undefined, { retry: false, staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: [] });
  const visiblePhotos = photos.data ?? [];
  return <TsukiLayout><section className="tsuki-subhero"><h1>Gallery</h1></section><section className="tsuki-photo-list">{photos.isError ? <div className="tsuki-empty tsuki-glass" role="alert"><Camera size={25} /><p>Galleryを取得できませんでした。ページを再読み込みしてください。</p><button type="button" onClick={() => window.location.reload()}>ページを再読み込み</button></div> : visiblePhotos.length ? visiblePhotos.map(photo => <article className="tsuki-glass" key={photo.id}><img src={photo.imageUrl} alt={photo.title} /><div><h2>{photo.title}</h2><p>{photo.caption}</p>{hasGalleryDetails(photo) && <small>{[photo.camera, photo.lens, photo.location, formatDate(photo.takenAt)].filter(Boolean).join(" · ")}</small>}</div></article>) : <div className="tsuki-empty tsuki-glass"><Camera size={25} /><p>GALLERY IS EMPTY</p></div>}</section></TsukiLayout>;
}
