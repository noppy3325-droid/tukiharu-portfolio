import { TsukiLayout } from "@/components/TsukiLayout";

export default function About() {
  return <TsukiLayout><section className="gallery-page-heading"><p>ABOUT</p><h1>月春の資材置き場について</h1></section><section className="gallery-about"><div><h2>Archive</h2><p>つくったもの、読んだもの、写真、日々のBlog記事をまとめる個人のアーカイブです。</p><div className="gallery-contact gallery-about-contact"><span>CONTACT</span><a href="mailto:tukiharu3325@gmail.com">tukiharu3325@gmail.com</a></div></div><dl><div><dt>Works</dt><dd>制作の記録</dd></div><div><dt>Gallery</dt><dd>写真の記録</dd></div><div><dt>Blog</dt><dd>日々のBlog記事</dd></div></dl></section></TsukiLayout>;
}
