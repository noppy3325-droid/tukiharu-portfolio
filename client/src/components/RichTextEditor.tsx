import {
  acceptedImageMimeTypes,
  compressImageForUpload,
  formatImageBytes,
  imageOptimizationModeLabels,
  readFileAsBase64,
  type ImageOptimizationMode,
  validateImageSelection,
} from "@/lib/imageUpload";
import { createBlogEditorExtensions } from "@/lib/blogEditor";
import { trpc } from "@/lib/trpc";
import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  Minus,
  Quote,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { useEffect, useId, useRef, useState } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  label = "本文",
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePosition = useRef<number | null>(null);
  const pendingImageAltRef = useRef("");
  const imageUploadBusyRef = useRef(false);
  const inputId = useId();
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [imageAltText, setImageAltText] = useState("");
  const [optimizationMode, setOptimizationMode] =
    useState<ImageOptimizationMode>("balanced");
  const [imagesOpen, setImagesOpen] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const editor = useEditor({
    extensions: createBlogEditorExtensions(),
    content: value,
    editorProps: {
      attributes: {
        class: "rich-editor",
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-describedby": `${inputId}-hint`,
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    onTransaction: ({ transaction }) => {
      if (pendingImagePosition.current !== null)
        pendingImagePosition.current = transaction.mapping.map(
          pendingImagePosition.current
        );
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            block: editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : editor.isActive("heading", { level: 4 })
                  ? "h4"
                  : "p",
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            code: editor.isActive("codeBlock"),
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            typography: editor.getAttributes(
              editor.isActive("heading") ? "heading" : "paragraph"
            ),
          }
        : null,
  });
  const upload = trpc.admin.content.upload.image.useMutation({
    onSuccess: result => {
      if (!editor || editor.isDestroyed) return;
      const position = Math.min(
        pendingImagePosition.current ?? editor.state.selection.to,
        editor.state.doc.content.size
      );
      editor
        .chain()
        .focus()
        .insertContentAt(position, {
          type: "image",
          attrs: { src: result.url, alt: pendingImageAltRef.current.trim() },
        })
        .run();
      setImageStatus(
        pendingImageAltRef.current.trim()
          ? "圧縮済み画像と代替テキストを本文へ挿入しました。"
          : "圧縮済み画像を装飾画像として本文へ挿入しました。"
      );
      setImageAltText("");
      pendingImageAltRef.current = "";
      pendingImagePosition.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      pendingImagePosition.current = null;
    },
  });

  useEffect(() => {
    if (editor && (editor.isEmpty ? "" : editor.getHTML()) !== value)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const uploadImage = async (file: File | undefined) => {
    if (!file) {
      pendingImagePosition.current = null;
      return;
    }
    if (imageUploadBusyRef.current) return;
    upload.reset();
    const validationError = validateImageSelection(file);
    if (validationError) {
      pendingImagePosition.current = null;
      return setImageStatus(validationError);
    }
    imageUploadBusyRef.current = true;
    setIsPreparingImage(true);
    pendingImagePosition.current ??= editor?.state.selection.to ?? null;
    pendingImageAltRef.current = imageAltText;
    setImageStatus("画像を圧縮しています…");
    try {
      const compressed = await compressImageForUpload(file, optimizationMode);
      setImageStatus(
        `圧縮後 ${formatImageBytes(compressed.compressedBytes)}。サーバーへアップロードしています…`
      );
      const base64 = await readFileAsBase64(compressed.file);
      await upload.mutateAsync({
        filename: compressed.file.name,
        mimeType: compressed.file
          .type as (typeof acceptedImageMimeTypes)[number],
        base64,
        scope: "blog",
      });
    } catch (error) {
      pendingImagePosition.current = null;
      setImageStatus(
        error instanceof Error ? error.message : "画像を挿入できませんでした。"
      );
    } finally {
      imageUploadBusyRef.current = false;
      setIsPreparingImage(false);
    }
  };

  const chooseImage = () => {
    if (!editor || editor.isDestroyed || imageUploadBusyRef.current) return;
    pendingImagePosition.current = editor.state.selection.to;
    // Keep the native picker inside the click gesture, including on mobile Safari.
    fileInputRef.current?.click();
  };

  return (
    <div className="editor-wrap blog-composer">
      <div className="editor-label">
        <span>{label}</span>
        <small>
          <span aria-hidden="true">✦</span> ことばのノート
        </small>
      </div>
      <fieldset className="editor-typography-panel">
        <legend>段落の配置</legend>
        <div className="editor-typography-fields">
          <label className="editor-typography-field">
            <span>文字揃え</span>
            <select
              aria-label="文字揃え"
              value={state?.typography.textAlign ?? ""}
              disabled={!editor || state?.code}
              onChange={event =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("paragraph", {
                    textAlign: event.target.value || null,
                  })
                  .updateAttributes("heading", {
                    textAlign: event.target.value || null,
                  })
                  .run()
              }
            >
              <option value="">標準</option>
              <option value="left">左揃え</option>
              <option value="center">中央揃え</option>
              <option value="right">右揃え</option>
            </select>
          </label>
        </div>
        {state?.code && (
          <p>
            コードブロックでは文字揃えを変更できません。本文や見出しを選んでください。
          </p>
        )}
      </fieldset>
      <div className="editor-toolbar" role="group" aria-label="文章の装飾">
        <select
          aria-label="段落の種類"
          value={state?.block ?? "p"}
          onChange={event => {
            const level = { h2: 2, h3: 3, h4: 4 }[event.target.value];
            level
              ? editor
                  ?.chain()
                  .focus()
                  .setHeading({ level: level as 2 | 3 | 4 })
                  .run()
              : editor?.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">本文</option>
          <option value="h2">大きな見出し</option>
          <option value="h3">中くらいの見出し</option>
          <option value="h4">小さな見出し</option>
        </select>
        <EditorButton
          editor={editor}
          label="太字"
          active={state?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="斜体"
          active={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="箇条書き"
          active={state?.bullet}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="番号付きリスト"
          active={state?.ordered}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="引用"
          active={state?.quote}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="コードブロック"
          active={state?.code}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="区切り線"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={17} />
        </EditorButton>
        <span className="editor-toolbar-separator" aria-hidden="true" />
        <EditorButton
          editor={editor}
          label="元に戻す"
          disabled={!state?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </EditorButton>
        <EditorButton
          editor={editor}
          label="やり直す"
          disabled={!state?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </EditorButton>
        <button
          className="editor-image-toggle"
          type="button"
          title="画像を選択して本文へ挿入"
          disabled={!editor || isPreparingImage || upload.isPending}
          onClick={chooseImage}
        >
          {isPreparingImage || upload.isPending ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <ImagePlus size={17} />
          )}
          <span>画像</span>
        </button>
        <button
          className="editor-image-settings-toggle"
          type="button"
          aria-label="画像の説明と画質設定"
          title="画像の説明と画質設定"
          aria-expanded={imagesOpen}
          aria-controls={`${inputId}-images`}
          onClick={() => setImagesOpen(!imagesOpen)}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-label="本文に挿入する画像ファイル"
        accept="image/jpeg,image/png,image/webp"
        disabled={!editor || isPreparingImage || upload.isPending}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void uploadImage(file);
        }}
      />
      <div className="editor-writing-hint" id={`${inputId}-hint`}>
        <span>
          <kbd>#</kbd> + スペースで見出し。全角でもOK。
        </span>
        <details>
          <summary>書き方のヒント</summary>
          <dl>
            <div>
              <dt>
                <kbd>#</kbd> <kbd>##</kbd> <kbd>###</kbd>
              </dt>
              <dd>大・中・小の見出し</dd>
            </div>
            <div>
              <dt>
                <kbd>-</kbd> <kbd>*</kbd> <kbd>1.</kbd>
              </dt>
              <dd>箇条書き・番号付きリスト</dd>
            </div>
            <div>
              <dt>
                <kbd>&gt;</kbd> <kbd>```</kbd> <kbd>---</kbd>
              </dt>
              <dd>引用・コード・区切り線</dd>
            </div>
          </dl>
          <p>
            行の先頭で記号のあとにスペース。全角の記号とスペースにも対応します。変換直後のBackspaceで元に戻せます。
          </p>
        </details>
      </div>
      <div
        className="editor-image-panel"
        id={`${inputId}-images`}
        hidden={!imagesOpen}
      >
        <label className="editor-image-alt" htmlFor={`${inputId}-alt`}>
          <span>画像の説明</span>
          <input
            id={`${inputId}-alt`}
            value={imageAltText}
            onChange={event => setImageAltText(event.target.value)}
            placeholder="例：窓辺に置いたフィルムカメラ"
            maxLength={240}
          />
        </label>
        <label className="editor-image-alt" htmlFor={`${inputId}-optimization`}>
          <span>最適化</span>
          <select
            id={`${inputId}-optimization`}
            value={optimizationMode}
            onChange={event =>
              setOptimizationMode(event.target.value as ImageOptimizationMode)
            }
            disabled={isPreparingImage || upload.isPending}
          >
            {Object.entries(imageOptimizationModeLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>
        <p className="editor-image-help">
          設定したら、ツールバーの「画像」からファイルを選んでください。説明は代替テキストとして保存されます。装飾画像は空欄のまま挿入できます。
        </p>
      </div>
      <EditorContent editor={editor} className="editor-content" />
      {(imageStatus || upload.error) && (
        <p
          role="status"
          className={
            upload.error ||
            imageStatus?.includes("してください") ||
            imageStatus?.includes("できません")
              ? "editor-image-error"
              : "editor-image-status"
          }
        >
          {upload.error?.message ?? imageStatus}
        </p>
      )}
    </div>
  );
}

function EditorButton({
  editor,
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  editor: Editor | null;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={!editor || disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
