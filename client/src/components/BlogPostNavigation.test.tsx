import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlogPostNavigation } from "./BlogPostNavigation";

describe("BlogPostNavigation", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { pathname: "/blog/current", search: "", hash: "" });
  });

  it("renders direct links to both adjacent Blog posts", () => {
    const markup = renderToStaticMarkup(<BlogPostNavigation newer={{ title: "新しい記事", slug: "newer-post" }} older={{ title: "前の記事", slug: "older-post" }} />);
    expect(markup).toContain('href="/blog/newer-post"');
    expect(markup).toContain('href="/blog/older-post"');
    expect(markup).toContain("NEWER POST");
    expect(markup).toContain("OLDER POST");
  });

  it("explains the boundary when no adjacent post exists", () => {
    const markup = renderToStaticMarkup(<BlogPostNavigation newer={null} older={null} />);
    expect(markup).toContain("これより新しい記事はありません");
    expect(markup).toContain("これより前の記事はありません");
  });
});
