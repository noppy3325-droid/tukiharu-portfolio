import { Button } from "@/components/ui/button";
import { acceptedImageMimeTypes, compressImageForUpload, formatImageBytes, imageTitleFromFilename, maxBatchImageCount, readFileAsBase64, type CompressedImage, validateImageSelection } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";
import { Check, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type BatchImage = CompressedImage & { id: string; title: string; previewUrl: string };
type AdminBatchImageUploadProps = { onUploaded: (images: Array<{ title: string; url: string }>) => Promise<void> };

export function AdminBatchImageUpload({ onUploaded }: AdminBatchImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const upload = trpc.admin.content.upload.image.useMutation();

  useEffect(() => () => images.forEach(image => URL.revokeObjectURL(image.previewUrl)), [images]);

  const chooseFiles = async (fileList: FileList | null) => {
    const sourceFiles = Array.from(fileList ?? []);
    if (!sourceFiles.length) return;
    if (sourceFiles.length > maxBatchImageCount) return setMessage(`一度に選択できる画像は${maxBatchImageCount}件までです。`);
    const validationError = sourceFiles.map(validateImageSelection).find(Boolean);
    if (validationError) return setMessage(validationError);
    setMessage(null);
    setIsCompressing(true);
    try {
      const compressed = await Promise.all(sourceFiles.map(async file => {
        const image = await compressImageForUpload(file);
        return { ...image, id: crypto.randomUUID(), title: imageTitleFromFilename(file.name), previewUrl: URL.createObjectURL(image.file) };
      }));
      setImages(current => { current.forEach(image => URL.revokeObjectURL(image.previewUrl)); return compressed; });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像を圧縮できませんでした。");
    } finally {
      setIsCompressing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => setImages(current => {
    const image = current.find(item => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    return current.filter(item => item.id !== id);
  });

  const uploadAll = async () => {
    if (!images.length) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const uploaded: Array<{ title: string; url: string }> = [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const base64 = await readFileAsBase64(image.file);
        const result = await upload.mutateAsync({ filename: image.file.name, mimeType: image.file.type as (typeof acceptedImageMimeTypes)[number], base64, scope: "gallery" });
        uploaded.push({ title: image.title, url: result.url });
      }
      await onUploaded(uploaded);
      images.forEach(image => URL.revokeObjectURL(image.previewUrl));
      setImages([]);
      setMessage(`${uploaded.length}件の画像をGalleryへ追加しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "一括アップロードに失敗しました。未登録の画像を確認してください。");
    } finally {
      setIsUploading(false);
    }
  };

  return <section className="admin-batch-upload" aria-labelledby={`${inputId}-heading`}>
    <div><p className="admin-panel-kicker">BATCH IMAGE UPLOAD</p><h3 id={`${inputId}-heading`}>複数画像をまとめてGalleryへ追加</h3><p>最大{maxBatchImageCount}件を一度に最適化してアップロードします。元画像より大きい変換結果は使わず、タイトルはファイル名から自動設定され、後から編集できます。</p></div>
    <div className="admin-image-upload-actions"><input ref={inputRef} id={inputId} className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => void chooseFiles(event.target.files)} /><label className="admin-image-select" htmlFor={inputId}><ImagePlus size={16} />複数ファイルを選ぶ</label><span>{isCompressing ? "画像を圧縮中…" : images.length ? `${images.length}件を選択中` : "ファイル未選択"}</span><Button type="button" className="rounded-xl bg-[#4f8eaa] hover:bg-[#3e7892]" disabled={!images.length || isCompressing || isUploading} onClick={() => void uploadAll()}>{isUploading ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}{isUploading ? "登録中…" : "まとめてアップロード・登録"}</Button></div>
    {images.length > 0 && <div className="admin-batch-preview-grid">{images.map(image => <article key={image.id}><img src={image.previewUrl} alt={`${image.title}の最適化後プレビュー`} /><div><strong>{image.title}</strong><span>{image.keptOriginal ? `${formatImageBytes(image.originalBytes)}（元画像を使用）` : `${formatImageBytes(image.originalBytes)} → ${formatImageBytes(image.compressedBytes)}`}</span><small>{image.width} × {image.height}px</small></div><button type="button" onClick={() => removeImage(image.id)} aria-label={`${image.title}を一覧から外す`}><X size={15} /></button></article>)}</div>}
    {message && <p className={message.includes("追加しました") ? "admin-save-success" : "admin-login-error"} role="status">{message.includes("追加しました") && <Check size={14} />}{message}</p>}
  </section>;
}
