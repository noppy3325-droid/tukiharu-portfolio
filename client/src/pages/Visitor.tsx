import { useState } from "react";
import { TsukiLayout } from "@/components/TsukiLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function Visitor() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <TsukiLayout>
      <section className="profile-section">
        <p className="gallery-section-label">COMMENTS</p>
        <h1>コメントに使う名前</h1>
        <p>
          表示名は本人確認済みのアカウントではありません。このブラウザで投稿したコメントを編集・削除できます。
        </p>
        <form
          className="admin-repeat"
          onSubmit={async e => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/trpc/visitor.start", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                  "Content-Type": "application/json",
                  "X-Portfolio-Request": "1",
                },
                body: JSON.stringify({ json: { name } }),
              });
              const result = await response.json();
              if (result.error) throw new Error(result.error.json.message);
              if (!response.ok) throw new Error("名前を登録できませんでした。");
              const target =
                new URLSearchParams(location.search).get("return") || "/";
              location.assign(
                target.startsWith("/") &&
                  !target.startsWith("//") &&
                  !target.includes("\\")
                  ? target
                  : "/"
              );
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "登録できませんでした。"
              );
              setBusy(false);
            }
          }}
        >
          <label className="admin-field">
            <span>表示名</span>
            <Input
              required
              maxLength={80}
              autoComplete="nickname"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
          <Button disabled={busy}>
            {busy ? "登録中…" : "この名前でコメントする"}
          </Button>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </TsukiLayout>
  );
}
