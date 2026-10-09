import { acceptedImageMimeTypes, compressImageForUpload, formatImageBytes, imageOptimizationModeLabels, readFileAsBase64, type ImageOptimizationMode, validateImageSelection } from "@/lib/imageUpload";
import { buildInlineBlogImageHtml } from "@/lib/richTextImage";
import { trpc } from "@/lib/trpc";
import { Bold, ImagePlus, Italic, List, ListOrdered, LoaderCircle, Pilcrow } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type RichTextEditorProps = { value: string; onChange: (value: string) => void; label?: string };

export default function RichTextEditor({ value, onChange, label = "本文" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const pendingImageAltRef = useRef("");
  const inputId = useId();
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [imageAltText, setImageAltText] = useState("");
  const [optimizationMode, setOptimizationMode] = useState<ImageOptimizationMode>("balanced");
  const upload = trpc.admin.content.upload.image.useMutation({
    onSuccess: result => {
      restoreSelection();
      document.execCommand("insertHTML", false, buildInlineBlogImageHtml(result.url, pendingImageAltRef.current));
      onChange(editorRef.current?.innerHTML || "");
      setImageStatus(pendingImageAltRef.current.trim() ? "圧縮済み画像と代替テキストを本文へ挿入しました。" : "圧縮済み画像を装飾画像として本文へ挿入しました。");
      setImageAltText("");
      pendingImageAltRef.current = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount) selectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRef.current);
  };

  const command = (name: string, argument?: string) => {
    restoreSelection();
    document.execCommand(name, false, argument);
    onChange(editorRef.current?.innerHTML || "");
    rememberSelection();
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateImageSelection(file);
    if (validationError) return setImageStatus(validationError);
    setImageStatus("画像を圧縮しています…");
    try {
      const compressed = await compressImageForUpload(file, optimizationMode);
      setImageStatus(`圧縮後 ${formatImageBytes(compressed.compressedBytes)}。サーバーへアップロードしています…`);
      const base64 = await readFileAsBase64(compressed.file);
      pendingImageAltRef.current = imageAltText;
      upload.mutate({ filename: compressed.file.name, mimeType: compressed.file.type as (typeof acceptedImageMimeTypes)[number], base64, scope: "blog" });
    } catch (error) {
      setImageStatus(error instanceof Error ? error.message : "画像を挿入できませんでした。");
    }
  };

  return <div className="editor-wrap">
    <div className="editor-label"><span>{label}</span><small>装飾したまま保存されます</small></div>
    <div className="editor-toolbar" aria-label="文章の装飾">
      <button type="button" onClick={() => command("bold")} aria-label="太字"><Bold size={16} /></button>
      <button type="button" onClick={() => command("italic")} aria-label="斜体"><Italic size={16} /></button>
      <button type="button" onClick={() => command("formatBlock", "h2")} aria-label="見出し"><Pilcrow size={16} /></button>
      <button type="button" onClick={() => command("insertUnorderedList")} aria-label="箇条書き"><List size={16} /></button>
      <button type="button" onClick={() => command("insertOrderedList")} aria-label="番号付きリスト"><ListOrdered size={16} /></button>
      <label className="editor-image-alt" htmlFor={`${inputId}-alt`}>
        <span>画像の説明</span>
        <input id={`${inputId}-alt`} value={imageAltText} onChange={event => setImageAltText(event.target.value)} placeholder="例：窓辺に置いたフィルムカメラ" maxLength={240} />
      </label>
      <label className="editor-image-alt" htmlFor={`${inputId}-optimization`}><span>最適化</span><select id={`${inputId}-optimization`} value={optimizationMode} onChange={event => setOptimizationMode(event.target.value as ImageOptimizationMode)} disabled={upload.isPending}>{Object.entries(imageOptimizationModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <input ref={fileInputRef} id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(event.target.files?.[0])} />
      <label className="editor-image-action" htmlFor={inputId} onMouseDown={rememberSelection} aria-label="画像を圧縮して本文へ挿入" title="画像を圧縮して本文へ挿入"><ImagePlus size={16} /><span>本文画像</span>{upload.isPending && <LoaderCircle className="animate-spin" size={13} />}</label>
    </div>
    <p className="editor-image-help">画像の説明は公開ページの代替テキストとして保存されます。装飾目的の画像は空欄のまま挿入できます。</p>
    {imageStatus && <p className={upload.error || imageStatus.includes("してください") || imageStatus.includes("できません") ? "editor-image-error" : "editor-image-status"}>{imageStatus}</p>}
    <div ref={editorRef} className="rich-editor" role="textbox" aria-label={label} aria-multiline="true" contentEditable suppressContentEditableWarning onMouseUp={rememberSelection} onKeyUp={rememberSelection} onFocus={rememberSelection} onInput={event => { onChange(event.currentTarget.innerHTML); rememberSelection(); }} data-placeholder="ここに記事本文を書いてね…" />
  </div>;
}
