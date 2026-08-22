import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "BlogPost.tsx"), "utf8");

describe("コメント削除UI", () => {
  it("自分のコメントだけに削除確認を表示する", () => {
    expect(source).toContain("comment.authorId === user?.id");
    expect(source).toContain("<CommentRemoveButton");
    expect(source).toContain("コメントを削除しますか？");
    expect(source).toContain("removeOwnComment.mutate({ id: comment.id })");
  });

  it("投稿後5分だけ編集でき、削除直後は取り消せる", () => {
    expect(source).toContain("COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000");
    expect(source).toContain("isCommentEditable(comment.createdAt)");
    expect(source).toContain("updateOwnComment.mutate({ id: editingComment.id, body: editingComment.body })");
    expect(source).toContain("restoreOwnComment.mutate({ id: undoComment.id })");
    expect(source).toContain("あと{undoSeconds}秒だけ取り消せます。");
  });

  it("編集済み日時を持つコメントにラベルを表示する", () => {
    expect(source).toContain("comment.editedAt &&");
    expect(source).toContain("simple-comment-edited");
    expect(source).toContain("編集済み");
  });
});
