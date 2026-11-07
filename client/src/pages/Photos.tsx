import { useLocale } from "@/contexts/LocaleContext";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { PortfolioHeading } from "@/components/PortfolioHeading";
import { galleryDetailSummary, hasGalleryDetails } from "@/lib/galleryDetails";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";



export default function Photos() {
  const { t, locale } = useLocale();
  const photos = trpc.content.gallery.list.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
  const visiblePhotos = photos.data ?? [];
  const [selectedPhoto, setSelectedPhoto] = useState<
    (typeof visiblePhotos)[number] | null
  >(null);
  const photoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const preventImageSave = (event: React.SyntheticEvent) =>
    event.preventDefault();

  useEffect(() => {
    if (!selectedPhoto) return;
    const preventSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")
        event.preventDefault();
    };
    window.addEventListener("keydown", preventSaveShortcut, true);
    return () =>
      window.removeEventListener("keydown", preventSaveShortcut, true);
  }, [selectedPhoto]);

  return (
    <TsukiLayout>
      <PortfolioHeading
        eyebrow={t("GALLERY / 写真の記録")}
        title="Gallery"
        description={t("目にとまった風景、日々の断片。写真を選ぶと大きく表示できます。")}
      />
      <section className="tsuki-photo-list" aria-label={t("写真Gallery")}>
        {photos.isError ? (
          <div className="tsuki-empty tsuki-glass" role="alert">
            <Camera size={25} />
            <p>{t("Galleryを取得できませんでした。ページを再読み込みしてください。")}</p>
            <button type="button" onClick={() => window.location.reload()}>{t("ページを再読み込み")}</button>
          </div>
        ) : visiblePhotos.length ? (
          visiblePhotos.map(photo => (
            <article className="tsuki-glass depot-drawer depot-motion" key={photo.id}>
              <button
                type="button"
                className="tsuki-gallery-image-trigger"
                onClick={event => {
                  photoTriggerRef.current = event.currentTarget;
                  setSelectedPhoto(photo);
                }}
                aria-label={locale === "ja" ? `${photo.title}を拡大表示` : `Enlarge ${photo.title}`}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onContextMenu={preventImageSave}
                  onDragStart={preventImageSave}
                />
                <span className="portfolio-photo-expand" aria-hidden="true">{t("拡大 ↗")}</span>
              </button>
              <div>
                <h2>{photo.title}</h2>
                <p>{photo.caption}</p>
                {hasGalleryDetails(photo) && (
                  <small>
                    {galleryDetailSummary(photo, locale)}
                  </small>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="tsuki-empty tsuki-glass">
            <Camera size={25} />
            <p>GALLERY IS EMPTY</p>
          </div>
        )}
      </section>
      <Dialog
        open={Boolean(selectedPhoto)}
        onOpenChange={open => {
          if (!open) setSelectedPhoto(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={event => {
            event.preventDefault();
            photoTriggerRef.current?.focus();
          }}
          className="tsuki-gallery-image-dialog"
          onContextMenu={preventImageSave}
        >
          <DialogTitle className="sr-only">
            {selectedPhoto?.title ?? t("画像の拡大表示")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("Escapeキー、閉じるボタン、または背景を選択すると拡大表示を閉じます。")}</DialogDescription>
          {selectedPhoto && (
            <>
              <div className="tsuki-gallery-image-viewer">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  draggable={false}
                  onContextMenu={preventImageSave}
                  onDragStart={preventImageSave}
                />
              </div>
              <div className="tsuki-gallery-image-caption">
                <strong>{selectedPhoto.title}</strong>
                <span>{selectedPhoto.caption}</span>{hasGalleryDetails(selectedPhoto) && <small>{galleryDetailSummary(selectedPhoto, locale)}</small>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TsukiLayout>
  );
}
