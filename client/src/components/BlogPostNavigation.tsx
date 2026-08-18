import React from "react";
import { Link } from "wouter";

type AdjacentPost = { title: string; slug: string } | null;

export function BlogPostNavigation({ newer, older }: { newer: AdjacentPost; older: AdjacentPost }) {
  return <nav className="blog-article-navigation" aria-label="Blog記事の前後移動">
    {newer ? <Link href={`/blog/${newer.slug}`} className="blog-article-navigation-newer"><span>NEWER POST</span><strong>{newer.title}</strong></Link> : <span className="blog-article-navigation-empty">これより新しい記事はありません</span>}
    {older ? <Link href={`/blog/${older.slug}`} className="blog-article-navigation-older"><span>OLDER POST</span><strong>{older.title}</strong></Link> : <span className="blog-article-navigation-empty blog-article-navigation-empty-right">これより前の記事はありません</span>}
  </nav>;
}
