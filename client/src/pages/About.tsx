import { TsukiLayout } from "@/components/TsukiLayout";
import { trpc } from "@/lib/trpc";

export default function About() {
  const profile = trpc.content.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const introduction = profile.data?.introduction ?? "つくったもの、読んだもの、Gallery、日々のBlog記事をまとめる個人のアーカイブです。";
  return <TsukiLayout><section className="gallery-page-heading"><p>ABOUT</p><h1>月春の資材置き場について</h1></section><section className="gallery-about"><div><h2>Archive</h2><p>{introduction}</p><div className="gallery-contact gallery-about-contact"><span>CONTACT</span><a href="mailto:tukiharu1125+portfolio@gmail.com">tukiharu1125+portfolio@gmail.com</a></div></div><dl><div><dt>Works</dt><dd>制作の記録</dd></div><div><dt>Gallery</dt><dd>Galleryの記録</dd></div><div><dt>Blog</dt><dd>日々のBlog記事</dd></div></dl></section></TsukiLayout>;
}
