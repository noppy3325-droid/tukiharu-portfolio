import { getNoteDetailErrorState } from "@/lib/notes";
import React from "react";

export function NoteDetailError({ errorCode }: { errorCode?: string }) {
  const errorState = getNoteDetailErrorState(errorCode);
  const message = errorState === "not-found"
    ? "記事が見つかりませんでした。"
    : "記事を取得できませんでした。時間をおいてもう一度お試しください。";

  return <p className="tsuki-page-state" role="alert">{message}<a href="/blog">ノート一覧へ</a></p>;
}
