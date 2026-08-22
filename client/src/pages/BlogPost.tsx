import { Heart, LogIn, MessageCircle, Pencil, Send, Trash2, Undo2 } from "lucide-react";
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

const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

function visitorKey() { const key = "little-room-visitor-key"; let value = localStorage.getItem(key); if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); } return value; }
function formatDate(date: Date | string) { return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date(date)); }
function isCommentEditable(createdAt: Date | string) { return Date.now() - new Date(createdAt).getTime() < COMMENT_EDIT_WINDOW_MS; }

function CommentRemoveButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return <AlertDialog><AlertDialogTrigger asChild><button type="button" className="simple-comment-delete" aria-label={label} title={label}><Trash2 size={14} /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>コメントを削除しますか？</AlertDialogTitle><AlertDialogDescription>削除すると元に戻せません。ただし、この画面では10秒間だけ取り消せます。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-[#a75a6a] hover:bg-[#8f4e5c]">削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const { isAuthenticated, user } = useAuth();
  const adminAccess = trpc.adminAccess.status.useQuery();
  const [key, setKey] = useState("");
  const [liked, setLiked] = useState(false);
  const [body, setBody] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: number; body: string } | null>(null);
  const [undoComment, setUndoComment] = useState<{ id: number; expiresAt: number } | null>(null);
  const [undoSeconds, setUndoSeconds] = useState(0);
  const postQuery = trpc.blog.bySlug.useQuery({ slug }, { enabled: Boolean(slug), retry: false });
  const post = postQuery.data;
  const navigationInput = useMemo(() => ({ id: post?.id ?? 0 }), [post?.id]);
  const navigation = trpc.blog.navigation.useQuery(navigationInput, { enabled: Boolean(post?.id), retry: false, staleTime: 60_000 });
  const comments = trpc.blog.comments.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const likes = trpc.blog.likes.useQuery({ id: post?.id ?? 0 }, { enabled: Boolean(post?.id) });
  const utils = trpc.useUtils();
  const invalidateComments = () => { if (post) return utils.blog.comments.invalidate({ id: post.id }); };
  const like = trpc.blog.like.useMutation({ onSuccess: result => { setLiked(true); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const unlike = trpc.blog.unlike.useMutation({ onSuccess: result => { setLiked(false); utils.blog.likes.setData({ id: post?.id ?? 0 }, result.count); } });
  const addComment = trpc.blog.addComment.useMutation({ onSuccess: () => { setBody(""); invalidateComments(); } });
  const updateOwnComment = trpc.blog.updateComment.useMutation({ onSuccess: () => { setEditingComment(null); invalidateComments(); } });
  const removeOwnComment = trpc.blog.removeComment.useMutation({ onSuccess: result => { setUndoComment({ id: result.id, expiresAt: new Date(result.undoExpiresAt).getTime() }); invalidateComments(); } });
  const restoreOwnComment = trpc.blog.restoreComment.useMutation({ onSuccess: () => { setUndoComment(null); invalidateComments(); } });
  const removeComment = trpc.admin.blog.comments.remove.useMutation({ onSuccess: invalidateComments });

  useEffect(() => { setKey(visitorKey()); }, []);
  useEffect(() => {
    if (!undoComment) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((undoComment.expiresAt - Date.now()) / 1000));
      setUndoSeconds(remaining);
      if (remaining === 0) setUndoComment(null);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [undoComment]);

  if (postQuery.isLoading) return <TsukiLayout><p className="tsuki-page-state">記事を開いています。</p></TsukiLayout>;
  if (postQuery.isError) return <TsukiLayout><NoteDetailError errorCode={postQuery.error.data?.code} /></TsukiLayout>;
  if (!post) return <TsukiLayout><NoteDetailError errorCode="NOT_FOUND" /></TsukiLayout>;

  const toggleLike = () => { if (!key) return; liked ? unlike.mutate({ id: post.id, visitorKey: key }) : like.mutate({ id: post.id, visitorKey: key }); };
  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editingComment?.body.trim()) updateOwnComment.mutate({ id: editingComment.id, body: editingComment.body });
  };

  return <TsukiLayout><div className="simple-portfolio tsuki-notes-wrap"><article className="simple-article"><header><p className="simple-kicker">MOON BLOG ✦</p><h1>{post.title}</h1><p>{post.excerpt}</p><time>{formatDate(post.publishedAt ?? post.createdAt)}</time></header><div className="simple-article-body" dangerouslySetInnerHTML={{ __html: post.content }} /><section className="simple-reactions"><button onClick={toggleLike} className={liked ? "is-liked" : ""} disabled={like.isPending || unlike.isPending}><Heart size={18} fill={liked ? "currentColor" : "none"} />{liked ? "いいね、ありがとう" : "いいね"}<b>{likes.data ?? 0}</b></button><span>気に入ったら、星のようにハートを置いていってね。</span></section><section className="simple-comments"><div className="simple-comments-heading"><div><p className="simple-kicker"><MessageCircle size={14} /> COMMENTS</p><h2>ことばを置いていく</h2></div><span>{comments.data?.length ?? 0}</span></div>{isAuthenticated ? <form onSubmit={event => { event.preventDefault(); if (body.trim()) addComment.mutate({ id: post.id, body }); }}><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="読んだ感想をやさしく書いてね…" /><Button type="submit" className="simple-comment-submit" disabled={addComment.isPending}><Send size={16} />コメントする</Button></form> : <div className="simple-comment-login"><LogIn size={18} /><p>コメントを残すにはログインが必要です。</p><Button onClick={() => startLogin()} variant="outline">ログインしてコメント</Button></div>}<div className="simple-comment-list">{comments.data?.length ? comments.data.map(comment => { const isOwnComment = comment.authorId === user?.id; const canEdit = isOwnComment && isCommentEditable(comment.createdAt); const isEditing = editingComment?.id === comment.id; return <article key={comment.id}><span>{comment.authorName?.slice(0, 1).toUpperCase() ?? "?"}</span><div><header><strong>{comment.authorName || "room visitor"}</strong><time>{formatDate(comment.createdAt)}</time>{comment.editedAt && <span className="simple-comment-edited" aria-label="このコメントは編集されています">編集済み</span>}<div className="simple-comment-actions">{canEdit && <button type="button" onClick={() => setEditingComment({ id: comment.id, body: comment.body })} aria-label="コメントを編集" title="投稿後5分以内は編集できます"><Pencil size={14} /></button>}{isOwnComment ? <CommentRemoveButton label="自分のコメントを削除" onConfirm={() => removeOwnComment.mutate({ id: comment.id })} /> : adminAccess.data?.isAdmin ? <CommentRemoveButton label="コメントを削除" onConfirm={() => removeComment.mutate({ id: comment.id })} /> : null}</div></header>{isEditing ? <form className="simple-comment-edit-form" onSubmit={submitEdit}><Textarea aria-label="コメントを編集" value={editingComment.body} onChange={event => setEditingComment(current => current ? { ...current, body: event.target.value } : current)} /><div><Button type="submit" size="sm" disabled={updateOwnComment.isPending}>保存する</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditingComment(null)}>キャンセル</Button></div></form> : <p>{comment.body}</p>}</div></article>; }) : <p className="simple-empty">最初のひとことを残してみませんか？</p>}</div>{undoComment && <div className="simple-comment-undo" role="status"><span>コメントを削除しました。あと{undoSeconds}秒だけ取り消せます。</span><div><Button type="button" size="sm" variant="outline" onClick={() => restoreOwnComment.mutate({ id: undoComment.id })} disabled={restoreOwnComment.isPending}><Undo2 size={14} />元に戻す</Button><button type="button" onClick={() => setUndoComment(null)} aria-label="取り消し案内を閉じる">閉じる</button></div></div>}</section><BlogPostNavigation newer={navigation.data?.newer ?? null} older={navigation.data?.older ?? null} /></article></div></TsukiLayout>;
}
