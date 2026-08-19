import { Button } from "@/components/ui/button";
import { acceptedImageMimeTypes, maxImageUploadBytes, validateImageSelection } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";
import { ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type AdminImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error("画像データの形式が正しくありません。"));
        return;
      }
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

export function AdminImageUpload({ value, onChange }: AdminImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const upload = trpc.admin.content.upload.image.useMutation({
    onSuccess: result => {
      onChange(result.url);
      setSelectedFile(null);
      setLocalPreviewUrl(result.url);
      setSelectionError(null);
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  useEffect(() => () => {
    if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  const previewUrl = localPreviewUrl ?? value;

  const selectFile = (file: File | undefined) => {
    setSelectionError(null);
    if (!file) return;
    const validationError = validateImageSelection(file);
    if (validationError) {
      setSelectedFile(null);
      setSelectionError(validationError);
      return;
    }
    setSelectedFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) return;
    try {
      const base64 = await readFileAsBase64(selectedFile);
      upload.mutate({
        filename: selectedFile.name,
        mimeType: selectedFile.type as (typeof acceptedImageMimeTypes)[number],
        base64,
      });
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "画像を読み込めませんでした。");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setSelectionError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return <section className="admin-image-upload" aria-labelledby={`${inputId}-heading`}>
    <div className="admin-image-upload-copy">
      <div><p className="admin-panel-kicker">IMAGE UPLOAD</p><h3 id={`${inputId}-heading`}>画像を直接アップロード</h3></div>
      <p>JPEG・PNG・WebP、5MBまで。アップロード後に写真の保存を押すとGalleryへ反映されます。</p>
    </div>
    <div className="admin-image-upload-actions">
      <input ref={inputRef} id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectFile(event.target.files?.[0])} />
      <label className="admin-image-select" htmlFor={inputId}><ImagePlus size={16} />ファイルを選ぶ</label>
      <span>{selectedFile ? `${selectedFile.name}（${Math.ceil(selectedFile.size / 1024)}KB）` : "ファイル未選択"}</span>
      <Button type="button" className="rounded-xl bg-[#4f8eaa] hover:bg-[#3e7892]" disabled={!selectedFile || upload.isPending} onClick={uploadSelectedFile}>
        {upload.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />} {upload.isPending ? "アップロード中…" : "S3へアップロード"}
      </Button>
    </div>
    {previewUrl ? <div className="admin-image-preview"><img src={previewUrl} alt="選択した画像のプレビュー" /><div><strong>{localPreviewUrl?.startsWith("blob:") ? "保存前プレビュー" : "現在の画像"}</strong><span>{localPreviewUrl?.startsWith("blob:") ? "この画像をS3へアップロードできます。" : "アップロード後、または画像URL入力後にここへ表示されます。"}</span>{localPreviewUrl?.startsWith("blob:") && <Button type="button" variant="ghost" onClick={clearSelectedFile}><X size={15} />選択を取り消す</Button>}</div></div> : <div className="admin-image-preview admin-image-preview-empty"><ImagePlus size={21} /><span>ファイルを選択すると、保存前のプレビューがここに表示されます。</span></div>}
    {selectionError && <p className="admin-login-error" role="alert">{selectionError}</p>}
    {upload.error && <p className="admin-login-error" role="alert">{upload.error.message || "画像をアップロードできませんでした。"}</p>}
    {upload.isSuccess && <p className="admin-save-success">S3へアップロードしました。続けて「写真を追加」または「変更を保存」を押してください。</p>}
  </section>;
}
