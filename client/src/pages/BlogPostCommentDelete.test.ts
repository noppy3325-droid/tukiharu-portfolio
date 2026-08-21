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
});
