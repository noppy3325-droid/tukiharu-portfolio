import { Bold, Italic, List, ListOrdered, Pilcrow } from "lucide-react";
import { useEffect, useRef } from "react";

type RichTextEditorProps = { value: string; onChange: (value: string) => void; label?: string };

export default function RichTextEditor({ value, onChange, label = "本文" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const command = (name: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    onChange(editorRef.current?.innerHTML || "");
  };

  return (
    <div className="editor-wrap">
      <div className="editor-label"><span>{label}</span><small>装飾したまま保存されます</small></div>
      <div className="editor-toolbar" aria-label="文章の装飾">
        <button type="button" onClick={() => command("bold")} aria-label="太字"><Bold size={16} /></button>
        <button type="button" onClick={() => command("italic")} aria-label="斜体"><Italic size={16} /></button>
        <button type="button" onClick={() => command("formatBlock", "h2")} aria-label="見出し"><Pilcrow size={16} /></button>
        <button type="button" onClick={() => command("insertUnorderedList")} aria-label="箇条書き"><List size={16} /></button>
        <button type="button" onClick={() => command("insertOrderedList")} aria-label="番号付きリスト"><ListOrdered size={16} /></button>
      </div>
      <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onInput={(event) => onChange(event.currentTarget.innerHTML)} data-placeholder="ここに記事本文を書いてね…" />
    </div>
  );
}
