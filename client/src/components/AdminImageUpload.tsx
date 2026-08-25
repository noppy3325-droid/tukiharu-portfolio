import { Button } from "@/components/ui/button";
import { acceptedImageMimeTypes, compressImageForUpload, formatImageBytes, imageOptimizationModeLabels, readFileAsBase64, type CompressedImage, type ImageOptimizationMode, validateImageSelection } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";
import { ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type AdminImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  onUploadComplete?: (result: { url: string; filename: string }) => void;
  scope?: "gallery" | "works" | "books" | "blog";
};

export function AdminImageUpload({ value, onChange, onUploadComplete, scope = "gallery" }: AdminImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<CompressedImage | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState<ImageOptimizationMode>("balanced");
  const upload = trpc.admin.content.upload.image.useMutation({
    onSuccess: (result, variables) => {
      onChange(result.url);
      onUploadComplete?.({ url: result.url, filename: variables.filename });
      setSelectedImage(null);
      setLocalPreviewUrl(result.url);
      setSelectionError(null);
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  useEffect(() => () => {
    if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  const previewUrl = localPreviewUrl ?? value;

  const selectFile = async (file: File | undefined) => {
    setSelectionError(null);
    if (!file) return;
    const validationError = validateImageSelection(file);
    if (validationError) {
      setSelectedImage(null);
      setSelectionError(validationError);
      return;
    }

    setIsCompressing(true);
    try {
      const compressedImage = await compressImageForUpload(file, optimizationMode);
      setSelectedImage(compressedImage);
      setLocalPreviewUrl(URL.createObjectURL(compressedImage.file));
    } catch (error) {
      setSelectedImage(null);
      setSelectionError(error instanceof Error ? error.message : "画像を圧縮できませんでした。");
    } finally {
      setIsCompressing(false);
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedImage) return;
    try {
      const base64 = await readFileAsBase64(selectedImage.file);
      upload.mutate({
        filename: selectedImage.file.name,
        mimeType: selectedImage.file.type as (typeof acceptedImageMimeTypes)[number],
        base64,
        scope,
      });
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "画像を読み込めませんでした。");
    }
  };

  const clearSelectedFile = () => {
    setSelectedImage(null);
    setLocalPreviewUrl(null);
    setSelectionError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return <section className="admin-image-upload" aria-labelledby={`${inputId}-heading`}>
    <div className="admin-image-upload-copy">
      <div><p className="admin-panel-kicker">IMAGE UPLOAD</p><h3 id={`${inputId}-heading`}>画像を直接アップロード</h3></div>
      <p>JPEG・PNG・WebPの元画像は20MBまで。画像ごとに画質と容量の優先度を選べます。元画像より大きい変換結果は使わず、SafariなどでWebPにできないJPEGはJPEGへ安全に変換します。</p>
    </div>
    <div className="admin-image-upload-actions">
      <input ref={inputRef} id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void selectFile(event.target.files?.[0])} />
      <label className="admin-image-select" htmlFor={inputId}><ImagePlus size={16} />ファイルを選ぶ</label>
      <label className="admin-image-optimization" htmlFor={`${inputId}-optimization`}><span>最適化</span><select id={`${inputId}-optimization`} value={optimizationMode} onChange={event => setOptimizationMode(event.target.value as ImageOptimizationMode)} disabled={isCompressing || upload.isPending}>{Object.entries(imageOptimizationModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <span>{isCompressing ? "画像を圧縮中…" : selectedImage ? `${selectedImage.file.name}（${formatImageBytes(selectedImage.compressedBytes)}）` : "ファイル未選択"}</span>
      <Button type="button" className="rounded-xl bg-[#4f8eaa] hover:bg-[#3e7892]" disabled={!selectedImage || isCompressing || upload.isPending} onClick={uploadSelectedFile}>
        {upload.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />} {upload.isPending ? "アップロード中…" : "S3へアップロード"}
      </Button>
    </div>
    {previewUrl ? <div className="admin-image-preview"><img src={previewUrl} alt="選択した画像のプレビュー" /><div><strong>{localPreviewUrl?.startsWith("blob:") ? selectedImage?.keptOriginal ? "元画像を使用" : "最適化後のプレビュー" : "現在の画像"}</strong><span>{localPreviewUrl?.startsWith("blob:") && selectedImage ? selectedImage.keptOriginal ? <>元画像 {formatImageBytes(selectedImage.originalBytes)}をそのまま使用します（変換後の方が大きくなるため）</> : <>{imageOptimizationModeLabels[selectedImage.optimizationMode]}：元画像 {formatImageBytes(selectedImage.originalBytes)} → 最適化後 {formatImageBytes(selectedImage.compressedBytes)}（{selectedImage.width} × {selectedImage.height}px）</> : "アップロード後、または画像URL入力後にここへ表示されます。"}</span>{localPreviewUrl?.startsWith("blob:") && <Button type="button" variant="ghost" onClick={clearSelectedFile}><X size={15} />選択を取り消す</Button>}</div></div> : <div className="admin-image-preview admin-image-preview-empty"><ImagePlus size={21} /><span>{isCompressing ? "画像の最適化プレビューを準備しています…" : "ファイルを選択すると、最適化後のプレビューがここに表示されます。"}</span></div>}
    {selectionError && <p className="admin-login-error" role="alert">{selectionError}</p>}
    {upload.error && <p className="admin-login-error" role="alert">{upload.error.message || "画像をアップロードできませんでした。"}</p>}
    {upload.isSuccess && <p className="admin-save-success">S3へアップロードし、フォームへ画像URLを反映しました。続けて「写真を追加」または「変更を保存」を押してください。</p>}
  </section>;
}
