import { useLocale } from "@/contexts/LocaleContext";
import { getNoteDetailErrorState } from "@/lib/notes";
import React from "react";

export function NoteDetailError({ errorCode }: { errorCode?: string }) {
  const { t, locale } = useLocale();
  const errorState = getNoteDetailErrorState(errorCode);
  const message = errorState === "not-found"
    ? t("記事が見つかりませんでした。")
    : t("記事を取得できませんでした。時間をおいてもう一度お試しください。");

  return <p className="tsuki-page-state" role="alert">{message}<a href="/blog">{t("Blog一覧へ")}</a></p>;
}
