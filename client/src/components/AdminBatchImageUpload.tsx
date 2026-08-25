import { Button } from "@/components/ui/button";
import { emptyGalleryDetails, galleryCameraSuggestions, galleryLensSuggestions } from "@/lib/galleryDetails";
import { acceptedImageMimeTypes, compressImageForUpload, formatImageBytes, imageOptimizationModeLabels, imageTitleFromFilename, maxBatchImageCount, readFileAsBase64, type CompressedImage, type ImageOptimizationMode, validateImageSelection } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";
import { Check, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type BatchImage = CompressedImage & { id: string; title: string; previewUrl: string };
export type BatchGalleryMetadata = { title: string; caption: string; camera: string; lens: string; location: string; takenAt: string; detailsMode: "none" | "details"; rotation: number };
export type BatchRegistrationResult = { registered: number; failures: string[] };
type AdminBatchImageUploadProps = { onUploaded: (images: Array<{ filename: string; url: string }>, metadata: BatchGalleryMetadata) => Promise<BatchRegistrationResult> };

export function AdminBatchImageUpload({ onUploaded }: AdminBatchImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<ImageOptimizationMode>("balanced");
  const [metadata, setMetadata] = useState<BatchGalleryMetadata>({ title: "", caption: "", ...emptyGalleryDetails, detailsMode: "none", rotation: 0 });
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
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
        const image = await compressImageForUpload(file, optimizationMode);
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
    if (!metadata.title.trim()) return setMessage("まとめて登録する写真のタイトルを入力してください。");
    setIsUploading(true);
    setMessage(null);
    setProgress({ completed: 0, total: images.length });
    try {
      const uploaded: Array<{ filename: string; url: string }> = [];
      const uploadFailures: string[] = [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        try {
          const base64 = await readFileAsBase64(image.file);
          const result = await upload.mutateAsync({ filename: image.file.name, mimeType: image.file.type as (typeof acceptedImageMimeTypes)[number], base64, scope: "gallery" });
          uploaded.push({ filename: image.file.name, url: result.url });
        } catch (error) {
          uploadFailures.push(`${image.title}：${error instanceof Error ? error.message : "S3へアップロードできませんでした。"}`);
        } finally {
          setProgress({ completed: index + 1, total: images.length });
        }
      }
      if (!uploaded.length) return setMessage(`画像をアップロードできませんでした。${uploadFailures.join(" ")}`);
      const registration = await onUploaded(uploaded, { ...metadata, title: metadata.title.trim(), caption: metadata.caption.trim() || "画像をまとめてアップロードしました。" });
      const failures = [...uploadFailures, ...registration.failures];
      if (!failures.length) {
        images.forEach(image => URL.revokeObjectURL(image.previewUrl));
        setImages([]);
        setMessage(`${registration.registered}件を「${metadata.title.trim()}」としてGalleryへ追加しました。`);
      } else {
        setMessage(`${registration.registered}件をGalleryへ追加しました。未完了 ${failures.length}件：${failures.join(" ")}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "一括アップロードに失敗しました。未登録の画像を確認してください。");
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  return <section className="admin-batch-upload" aria-labelledby={`${inputId}-heading`}>
    <div><p className="admin-panel-kicker">BATCH IMAGE UPLOAD</p><h3 id={`${inputId}-heading`}>同じ内容で複数画像をGalleryへ追加</h3><p>最大{maxBatchImageCount}件を一度に最適化してアップロードし、下のタイトル・キャプション・撮影詳細をすべての写真へ共通適用します。</p></div>
    <div className="admin-batch-metadata"><label><span>共通タイトル</span><input value={metadata.title} onChange={event => setMetadata(current => ({ ...current, title: event.target.value }))} placeholder="例：春の散歩" disabled={isCompressing || isUploading} /></label><label><span>共通キャプション</span><textarea value={metadata.caption} onChange={event => setMetadata(current => ({ ...current, caption: event.target.value }))} placeholder="未入力の場合は共通の説明文を設定します。" rows={2} disabled={isCompressing || isUploading} /></label><label><span>撮影詳細</span><select value={metadata.detailsMode} onChange={event => setMetadata(current => event.target.value === "none" ? { ...current, detailsMode: "none", ...emptyGalleryDetails } : { ...current, detailsMode: "details" })} disabled={isCompressing || isUploading}><option value="none">詳細なし（公開ページに表示しない）</option><option value="details">共通の撮影詳細を入力する</option></select></label>{metadata.detailsMode === "details" && <div className="admin-batch-detail-grid"><label><span>撮影カメラ</span><input list={`${inputId}-camera`} value={metadata.camera} onChange={event => setMetadata(current => ({ ...current, camera: event.target.value }))} /><datalist id={`${inputId}-camera`}>{galleryCameraSuggestions.map(camera => <option key={camera} value={camera} />)}</datalist></label><label><span>レンズ</span><input list={`${inputId}-lens`} value={metadata.lens} onChange={event => setMetadata(current => ({ ...current, lens: event.target.value }))} /><datalist id={`${inputId}-lens`}>{galleryLensSuggestions.map(lens => <option key={lens} value={lens} />)}</datalist></label><label><span>撮影場所</span><input value={metadata.location} onChange={event => setMetadata(current => ({ ...current, location: event.target.value }))} /></label><label><span>撮影日時</span><input type="datetime-local" value={metadata.takenAt} onChange={event => setMetadata(current => ({ ...current, takenAt: event.target.value }))} /></label></div>}<label><span>共通の傾き（-20〜20）</span><input type="number" min="-20" max="20" value={metadata.rotation} onChange={event => setMetadata(current => ({ ...current, rotation: Number(event.target.value) }))} disabled={isCompressing || isUploading} /></label></div>
    <div className="admin-image-upload-actions"><input ref={inputRef} id={inputId} className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => void chooseFiles(event.target.files)} /><label className="admin-image-select" htmlFor={inputId}><ImagePlus size={16} />複数ファイルを選ぶ</label><label className="admin-image-optimization" htmlFor={`${inputId}-optimization`}><span>最適化</span><select id={`${inputId}-optimization`} value={optimizationMode} onChange={event => setOptimizationMode(event.target.value as ImageOptimizationMode)} disabled={isCompressing || isUploading}>{Object.entries(imageOptimizationModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>{isCompressing ? "画像を圧縮中…" : progress ? `${progress.completed} / ${progress.total}件を処理中…` : images.length ? `${images.length}件を選択中` : "ファイル未選択"}</span><Button type="button" className="rounded-xl bg-[#4f8eaa] hover:bg-[#3e7892]" disabled={!images.length || isCompressing || isUploading} onClick={() => void uploadAll()}>{isUploading ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}{isUploading ? "登録中…" : "共通内容でまとめて登録"}</Button></div>
    {images.length > 0 && <div className="admin-batch-preview-grid">{images.map(image => <article key={image.id}><img src={image.previewUrl} alt={`${image.title}の最適化後プレビュー`} /><div><strong>{image.title}</strong><span>{image.keptOriginal ? `${formatImageBytes(image.originalBytes)}（元画像を使用）` : `${imageOptimizationModeLabels[image.optimizationMode]}：${formatImageBytes(image.originalBytes)} → ${formatImageBytes(image.compressedBytes)}`}</span><small>{image.width} × {image.height}px</small></div><button type="button" onClick={() => removeImage(image.id)} aria-label={`${image.title}を一覧から外す`}><X size={15} /></button></article>)}</div>}
    {message && <p className={message.includes("追加しました") && !message.includes("未完了") ? "admin-save-success" : "admin-login-error"} role="status">{message.includes("追加しました") && <Check size={14} />}{message}</p>}
  </section>;
}
