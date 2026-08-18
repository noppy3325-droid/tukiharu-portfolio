import { ArrowLeft, Heart, LogIn, MessageCircle, Send, Trash2 } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

function visitorKey() { const key = "little-room-visitor-key"; let value = localStorage.getItem(key); if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); } return value; }
function formatDate(date: Date | string) { return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date(date)); }

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const { user, isAuthenticated } = useAuth();
  const [key, setKey] = useState("");
  const [liked, setLiked] = useState(false);
  const [body, setBody] = useState("");
  const postQuery = trpc.blog.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const post = postQuery.data;
  const comments = trpc.blog.comments.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const likes = trpc.blog.likes.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const utils = trpc.useUtils();
  const like = trpc.blog.like.useMutation({ onSuccess: result => { setLiked(true); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const unlike = trpc.blog.unlike.useMutation({ onSuccess: result => { setLiked(false); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const addComment = trpc.blog.addComment.useMutation({ onSuccess: () => { setBody(""); if (post) utils.blog.comments.invalidate({ id: post.id }); } });
  const removeComment = trpc.admin.blog.comments.remove.useMutation({ onSuccess: () => { if (post) utils.blog.comments.invalidate({ id: post.id }); } });

  useEffect(() => { setKey(visitorKey()); }, []);
  if (postQuery.isLoading) return <main className="page-paper min-h-screen"><div className="loading-page">記事を開いています…</div></main>;
  if (!post) return <main className="page-paper min-h-screen"><div className="loading-page"><p>記事が見つかりませんでした。</p><Link href="/blog" className="back-link">ノート一覧へ</Link></div></main>;

  const toggleLike = () => { if (!key) return; liked ? unlike.mutate({ id: post.id, visitorKey: key }) : like.mutate({ id: post.id, visitorKey: key }); };
  return <main className="min-h-screen page-paper"><div className="site-topbar compact"><Link href="/" className="brand"><span>✦</span> little room</Link><Link href="/blog" className="back-link"><ArrowLeft size={16} />ノート一覧</Link></div><article className="article-shell"><header className={`article-header tone-${post.coverColor}`}><p className="eyebrow">ROOM NOTE</p><h1>{post.title}</h1><p>{post.excerpt}</p><time>{formatDate(post.publishedAt ?? post.createdAt)}</time></header><div className="article-body" dangerouslySetInnerHTML={{ __html: post.content }} /><section className="article-reaction"><button onClick={toggleLike} className={`like-button ${liked ? "is-liked" : ""}`} disabled={like.isPending || unlike.isPending}><Heart size={19} fill={liked ? "currentColor" : "none"} />{liked ? "いいね、ありがとう" : "いいね"}<b>{likes.data ?? 0}</b></button><span>気に入ったら、ハートを置いていってね。</span></section><section className="comment-area"><div className="comment-heading"><div><p className="eyebrow"><MessageCircle size={15} /> COMMENTS</p><h2>ことばを置いていく</h2></div><span>{comments.data?.length ?? 0} 件</span></div>{isAuthenticated ? <form onSubmit={(event) => { event.preventDefault(); if (body.trim()) addComment.mutate({ id: post.id, body }); }} className="comment-form"><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="読んだ感想をやさしく書いてね…" /><Button type="submit" className="rounded-2xl bg-[#a75a6a] hover:bg-[#8e4858]" disabled={addComment.isPending}><Send size={16} />コメントする</Button></form> : <div className="login-note"><LogIn size={18} /><p>コメントを残すには、ログインが必要です。</p><Button onClick={() => startLogin()} variant="outline" className="rounded-2xl border-[#b9d8c7] bg-white">ログインしてコメント</Button></div>}<div className="comment-list">{comments.data?.length ? comments.data.map(comment => <article className="comment" key={comment.id}><div className="comment-avatar">{comment.authorName?.slice(0, 1).toUpperCase() ?? "?"}</div><div><div className="comment-meta"><strong>{comment.authorName || "room visitor"}</strong><time>{formatDate(comment.createdAt)}</time>{user?.role === "admin" && <button onClick={() => removeComment.mutate({ id: comment.id })} aria-label="コメントを削除"><Trash2 size={14} /></button>}</div><p>{comment.body}</p></div></article>) : <p className="comment-empty">最初のひとことを残してみませんか？</p>}</div></section></article></main>;
}
