import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { NoteDetailError } from "./NoteDetailError";

describe("NoteDetailError", () => {
  it("renders the missing-note message and a link back to notes", () => {
    const markup = renderToStaticMarkup(<NoteDetailError errorCode="NOT_FOUND" />);
    expect(markup).toContain("記事が見つかりませんでした。");
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain("ノート一覧へ");
  });

  it("renders a distinct retrieval-error message and the same recovery link", () => {
    const markup = renderToStaticMarkup(<NoteDetailError errorCode="INTERNAL_SERVER_ERROR" />);
    expect(markup).toContain("記事を取得できませんでした。時間をおいてもう一度お試しください。");
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain("ノート一覧へ");
  });
});
