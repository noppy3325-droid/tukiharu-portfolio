import { Heart, LogIn, MessageCircle, Send, Trash2 } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { TsukiLayout } from "@/components/TsukiLayout";
import { NoteDetailError } from "@/components/NoteDetailError";
import { BlogPostNavigation } from "@/components/BlogPostNavigation";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";

function visitorKey() { const key = "little-room-visitor-key"; let value = localStorage.getItem(key); if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); } return value; }
function formatDate(date: Date | string) { return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date(date)); }
function CommentRemoveButton({ onConfirm }: { onConfirm: () => void }) { return <AlertDialog><AlertDialogTrigger asChild><button type="button" className="simple-comment-delete" aria-label="自分のコメントを削除"><Trash2 size={14} /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>コメントを削除しますか？</AlertDialogTitle><AlertDialogDescription>削除すると元に戻せません。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-[#a75a6a] hover:bg-[#8f4e5c]">削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>; }

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const { isAuthenticated, user } = useAuth();
  const adminAccess = trpc.adminAccess.status.useQuery();
  const [key, setKey] = useState("");
  const [liked, setLiked] = useState(false);
  const [body, setBody] = useState("");
  const postQuery = trpc.blog.bySlug.useQuery({ slug }, { enabled: Boolean(slug), retry: false });
  const post = postQuery.data;
  const navigationInput = useMemo(() => ({ id: post?.id ?? 0 }), [post?.id]);
  const navigation = trpc.blog.navigation.useQuery(navigationInput, { enabled: Boolean(post?.id), retry: false, staleTime: 60_000 });
  const comments = trpc.blog.comments.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const likes = trpc.blog.likes.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const utils = trpc.useUtils();
  const like = trpc.blog.like.useMutation({ onSuccess: result => { setLiked(true); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const unlike = trpc.blog.unlike.useMutation({ onSuccess: result => { setLiked(false); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const addComment = trpc.blog.addComment.useMutation({ onSuccess: () => { setBody(""); if (post) utils.blog.comments.invalidate({ id: post.id }); } });
  const removeOwnComment = trpc.blog.removeComment.useMutation({ onSuccess: () => { if (post) utils.blog.comments.invalidate({ id: post.id }); } });
  const removeComment = trpc.admin.blog.comments.remove.useMutation({ onSuccess: () => { if (post) utils.blog.comments.invalidate({ id: post.id }); } });
  useEffect(() => { setKey(visitorKey()); }, []);
  if (postQuery.isLoading) return <TsukiLayout><p className="tsuki-page-state">記事を開いています。</p></TsukiLayout>;
  if (postQuery.isError) return <TsukiLayout><NoteDetailError errorCode={postQuery.error.data?.code} /></TsukiLayout>;
  if (!post) return <TsukiLayout><NoteDetailError errorCode="NOT_FOUND" /></TsukiLayout>;
  const toggleLike = () => { if (!key) return; liked ? unlike.mutate({ id: post.id, visitorKey: key }) : like.mutate({ id: post.id, visitorKey: key }); };
  return <TsukiLayout><div className="simple-portfolio tsuki-notes-wrap"><article className="simple-article"><header><p className="simple-kicker">MOON BLOG ✦</p><h1>{post.title}</h1><p>{post.excerpt}</p><time>{formatDate(post.publishedAt ?? post.createdAt)}</time></header><div className="simple-article-body" dangerouslySetInnerHTML={{ __html: post.content }} /><section className="simple-reactions"><button onClick={toggleLike} className={liked ? "is-liked" : ""} disabled={like.isPending || unlike.isPending}><Heart size={18} fill={liked ? "currentColor" : "none"} />{liked ? "いいね、ありがとう" : "いいね"}<b>{likes.data ?? 0}</b></button><span>気に入ったら、星のようにハートを置いていってね。</span></section><section className="simple-comments"><div className="simple-comments-heading"><div><p className="simple-kicker"><MessageCircle size={14} /> COMMENTS</p><h2>ことばを置いていく</h2></div><span>{comments.data?.length ?? 0}</span></div>{isAuthenticated ? <form onSubmit={event => { event.preventDefault(); if (body.trim()) addComment.mutate({ id: post.id, body }); }}><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="読んだ感想をやさしく書いてね…" /><Button type="submit" className="simple-comment-submit" disabled={addComment.isPending}><Send size={16} />コメントする</Button></form> : <div className="simple-comment-login"><LogIn size={18} /><p>コメントを残すにはログインが必要です。</p><Button onClick={() => startLogin()} variant="outline">ログインしてコメント</Button></div>}<div className="simple-comment-list">{comments.data?.length ? comments.data.map(comment => <article key={comment.id}><span>{comment.authorName?.slice(0, 1).toUpperCase() ?? "?"}</span><div><header><strong>{comment.authorName || "room visitor"}</strong><time>{formatDate(comment.createdAt)}</time>{comment.authorId === user?.id ? <CommentRemoveButton onConfirm={() => removeOwnComment.mutate({ id: comment.id })} /> : adminAccess.data?.isAdmin ? <CommentRemoveButton onConfirm={() => removeComment.mutate({ id: comment.id })} /> : null}</header><p>{comment.body}</p></div></article>) : <p className="simple-empty">最初のひとことを残してみませんか？</p>}</div></section><BlogPostNavigation newer={navigation.data?.newer ?? null} older={navigation.data?.older ?? null} /></article></div></TsukiLayout>;
}
