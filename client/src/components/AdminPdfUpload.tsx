import { useId, useState } from "react";
import { Button } from "./ui/button";
export function AdminPdfUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="admin-repeat">
      <label className="admin-field" htmlFor={id}>
        <span>作品のPDF（10MBまで）</span>
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              setError("PDFは10MB以下にしてください。");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const form = new FormData();
              form.append("file", file);
              const response = await fetch("/api/media.php", {
                method: "POST",
                credentials: "same-origin",
                headers: { "X-Portfolio-Request": "1" },
                body: form,
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  result.message || "PDFをアップロードできませんでした。"
                );
              onChange(result.url);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "アップロードできませんでした。"
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">PDFをアップロードしています。</p>}
      {value && (
        <div>
          <a href={value} target="_blank" rel="noopener noreferrer">
            登録済みPDFを確認 ↗
          </a>
          <Button type="button" variant="ghost" onClick={() => onChange("")}>
            PDFの関連付けを解除
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
