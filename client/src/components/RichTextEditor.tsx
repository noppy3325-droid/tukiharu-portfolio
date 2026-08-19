import { acceptedImageMimeTypes, compressImageForUpload, formatImageBytes, readFileAsBase64, validateImageSelection } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";
import { Bold, ImagePlus, Italic, List, ListOrdered, LoaderCircle, Pilcrow } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type RichTextEditorProps = { value: string; onChange: (value: string) => void; label?: string };

export default function RichTextEditor({ value, onChange, label = "本文" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const inputId = useId();
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const upload = trpc.admin.content.upload.image.useMutation({
    onSuccess: result => {
      restoreSelection();
      document.execCommand("insertHTML", false, `<img src="${result.url}" alt="" />`);
      onChange(editorRef.current?.innerHTML || "");
      setImageStatus("圧縮済み画像を本文へ挿入しました。");
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
      const compressed = await compressImageForUpload(file);
      setImageStatus(`圧縮後 ${formatImageBytes(compressed.compressedBytes)}。S3へアップロードしています…`);
      const base64 = await readFileAsBase64(compressed.file);
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
      <input ref={fileInputRef} id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(event.target.files?.[0])} />
      <label className="editor-image-action" htmlFor={inputId} onMouseDown={rememberSelection} aria-label="画像を圧縮して本文へ挿入"><ImagePlus size={16} />{upload.isPending && <LoaderCircle className="animate-spin" size={13} />}</label>
    </div>
    {imageStatus && <p className={upload.error || imageStatus.includes("してください") || imageStatus.includes("できません") ? "editor-image-error" : "editor-image-status"}>{imageStatus}</p>}
    <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onMouseUp={rememberSelection} onKeyUp={rememberSelection} onFocus={rememberSelection} onInput={event => { onChange(event.currentTarget.innerHTML); rememberSelection(); }} data-placeholder="ここに記事本文を書いてね…" />
  </div>;
}
