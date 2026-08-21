import { TsukiLayout } from "@/components/TsukiLayout";
import { buildHomeUpdates } from "@/lib/homeUpdates";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

type GalleryEntry = { id: string; href: string; title: string; meta: string; updatedAt: Date | string; kind: "work" | "book" | "photo" | "note"; imageUrl?: string | null };
function formatDate(date: Date | string) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date)); }
function GalleryThumbnail({ kind }: { kind: GalleryEntry["kind"] }) {
  if (kind === "work") return <svg viewBox="0 0 240 230" aria-hidden="true"><rect width="240" height="230" fill="#f4e6ed" /><rect x="44" y="32" width="152" height="166" fill="#fffaf8" /><path d="M69 166c25-44 44-24 59-52 13-25 28-37 47-52" fill="none" stroke="#c99aac" strokeWidth="2" /><circle cx="161" cy="79" r="20" fill="#e6c8d3" /><rect x="62" y="51" width="54" height="3" fill="#cfabb7" /></svg>;
  if (kind === "book") return <svg viewBox="0 0 240 230" aria-hidden="true"><rect width="240" height="230" fill="#eee9f6" /><path d="M45 54h76v124H45z" fill="#c9bcd6" /><path d="M121 54h74v124h-74z" fill="#f9f7fb" /><path d="M121 54c20-9 46-8 74 0M121 54c-22-9-49-8-76 0" fill="none" stroke="#aaa0bd" strokeWidth="2" /><path d="M66 83h34M66 97h41M139 83h32M139 97h39" stroke="#d5cddd" strokeWidth="2" /></svg>;
  return <svg viewBox="0 0 240 230" aria-hidden="true"><rect width="240" height="230" fill="#f8f2e8" /><rect x="52" y="31" width="138" height="169" rx="2" fill="#fffdf8" /><path d="M75 73h91M75 94h70M75 115h86M75 136h51" stroke="#d1baae" strokeWidth="2" /><path d="M74 161c20-11 40-11 60 0" fill="none" stroke="#c691a4" strokeWidth="2" /></svg>;
}

export default function Home() {
  const works = trpc.content.works.list.useQuery();
  const books = trpc.content.books.list.useQuery();
  const photos = trpc.content.gallery.list.useQuery();
  const notes = trpc.blog.list.useQuery();
  const profile = trpc.content.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const introduction = profile.data?.introduction ?? "つくったもの、読んだもの、Gallery、日々のBlog記事をまとめる個人のアーカイブです。気になることがあれば、下のメールアドレスから気軽にご連絡ください。";
  const entries: GalleryEntry[] = buildHomeUpdates([
    ...(works.data ?? []).map(item => ({ id: `work-${item.id}`, href: "/works", title: item.title, meta: item.category, updatedAt: item.updatedAt, kind: "work" as const, imageUrl: item.thumbnailUrl })),
    ...(books.data ?? []).map(item => ({ id: `book-${item.id}`, href: "/library", title: item.title, meta: item.author, updatedAt: item.updatedAt, kind: "book" as const, imageUrl: item.coverImageUrl })),
    ...(photos.data ?? []).map(item => ({ id: `photo-${item.id}`, href: "/photos", title: item.title, meta: "Gallery", updatedAt: item.updatedAt, kind: "photo" as const, imageUrl: item.imageUrl })),
    ...(notes.data ?? []).map(item => ({ id: `note-${item.id}`, href: `/blog/${item.slug}`, title: item.title, meta: "Blog", updatedAt: item.updatedAt, kind: "note" as const })),
  ]).slice(0, 12);
  const loading = works.isLoading || books.isLoading || photos.isLoading || notes.isLoading;
  const loadError = works.isError || books.isError || photos.isError || notes.isError;
  return <TsukiLayout><section className="gallery-intro"><p>PORTFOLIO</p><h1>Gallery</h1></section><section className="gallery-grid" aria-label="公開コンテンツ">{loading ? <p className="gallery-state">作品を読み込んでいます。</p> : loadError ? <p className="gallery-state">作品を取得できませんでした。</p> : entries.length ? entries.map(entry => <Link href={entry.href} className="gallery-card" key={entry.id}><div className={`gallery-thumb gallery-thumb-${entry.kind}`}>{entry.imageUrl ? <img src={entry.imageUrl} alt={entry.title} /> : <GalleryThumbnail kind={entry.kind} />}</div><div className="gallery-card-copy"><h2>{entry.title}</h2><p>{entry.meta}<time>{formatDate(entry.updatedAt)}</time></p></div></Link>) : <p className="gallery-state">公開コンテンツを準備しています。</p>}</section><section className="gallery-home-info" aria-labelledby="home-about-heading"><div className="gallery-home-info-inner"><div><p className="gallery-section-label">ABOUT</p><h2 id="home-about-heading">月春の資材置き場について</h2><p>{introduction}</p></div><div className="gallery-contact"><span>CONTACT</span><a href="mailto:tukiharu3325+portfolio@gmail.com">tukiharu3325+portfolio@gmail.com</a></div></div></section><section className="gallery-updates" aria-labelledby="updates-heading"><div className="gallery-updates-inner"><p className="gallery-section-label">UPDATES</p><h2 id="updates-heading">最近の更新</h2>{loading ? <p className="gallery-updates-empty">更新情報を読み込んでいます。</p> : loadError ? <p className="gallery-updates-empty">更新情報を取得できませんでした。</p> : entries.length ? <ul className="gallery-update-list">{entries.slice(0, 3).map(entry => <li key={`update-${entry.id}`}><a href={entry.href} className="gallery-update-link"><span>{formatDate(entry.updatedAt)} · {entry.meta}</span><strong>{entry.title}</strong></a></li>)}</ul> : <p className="gallery-updates-empty">公開コンテンツを準備しています。</p>}</div></section></TsukiLayout>;
}
