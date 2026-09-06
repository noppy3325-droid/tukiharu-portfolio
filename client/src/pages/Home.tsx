import { useEffect, useState } from "react";
import {
  Aperture,
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Focus,
  Menu,
  MoveRight,
  ScanLine,
  Sparkles,
  Triangle,
  X,
} from "lucide-react";

type DesignVersion = "A" | "B";

const ASSET = "/aura-assets";

const featureItems = [
  {
    number: "01",
    title: "光を、逃さない。",
    body: "裏面照射型45.0MPフルサイズセンサーが、微細なハイライトから深い影まで、空気の濃度ごと記録します。",
    icon: Aperture,
  },
  {
    number: "02",
    title: "意図に、迷わない。",
    body: "被写体認識AFは人物・動物・乗り物を瞬時に検出。創作のリズムを止めない、信頼できる追従性能です。",
    icon: Focus,
  },
  {
    number: "03",
    title: "持ち出したくなる。",
    body: "チタン合金を精密に削り出した469gのボディ。過酷な旅にも、何気ない散歩にも自然に馴染みます。",
    icon: Sparkles,
  },
];

const specs = [
  ["有効画素数", "約45.0メガピクセル"],
  ["撮像素子", "35mmフルサイズ 裏面照射型CMOS"],
  ["画像処理エンジン", "AURA CORE 7"],
  ["AFシステム", "779点ハイブリッド位相差AF"],
  ["連写性能", "最大30コマ／秒（電子シャッター）"],
  ["ISO感度", "ISO 100–51200（拡張 50–204800）"],
  ["動画記録", "6K 30p / 4K 120p / 10-bit Log"],
  ["ボディ", "チタン合金・防塵防滴・約469g"],
];

const sampleImages = [
  { src: `${ASSET}/aura-gallery-coast.jpg`, alt: "朝霧の海岸を写した作例", title: "First light", meta: "45mm · f/8 · 1/2 sec" },
  { src: `${ASSET}/aura-gallery-night.jpg`, alt: "雨上がりの夜の街を写した作例", title: "After the rain", meta: "35mm · f/2 · 1/125 sec" },
  { src: `${ASSET}/aura-gallery-flower.jpg`, alt: "雫をまとったアイリスを写した作例", title: "Quiet bloom", meta: "90mm · f/2.8 · 1/320 sec" },
];

function DesignSwitchBar({ version, onChange }: { version: DesignVersion; onChange: (version: DesignVersion) => void }) {
  return (
    <aside className="aura-switch-bar" aria-label="デザイン比較の切り替え">
      <div className="aura-switch-inner">
        <div className="aura-study-label">
          <span className="aura-study-dot" aria-hidden="true" />
          <span>UI PARAMETER STUDY</span>
        </div>
        <div className="aura-switch-control" role="group" aria-label="デザインバージョン">
          <button
            type="button"
            className={version === "A" ? "is-active" : ""}
            aria-pressed={version === "A"}
            onClick={() => onChange("A")}
          >
            <strong>Ver. A</strong><span>効率・実用型</span>
          </button>
          <button
            type="button"
            className={version === "B" ? "is-active" : ""}
            aria-pressed={version === "B"}
            onClick={() => onChange("B")}
          >
            <strong>Ver. B</strong><span>没入・演出型</span>
          </button>
        </div>
        <p className="aura-switch-hint"><ScanLine size={14} /> 1 URL · Live comparison</p>
      </div>
    </aside>
  );
}

function Logo() {
  return <a className="aura-logo" href="#top" aria-label="AURA X-1 の先頭へ"><span className="aura-logo-mark">A</span><span>AURA</span></a>;
}

function AHeader() {
  return (
    <header className="aura-a-header">
      <div className="aura-a-wrap aura-a-header-inner">
        <Logo />
        <nav aria-label="製品ナビゲーション">
          <a href="#overview">製品概要</a>
          <a href="#specs">スペック</a>
          <a href="#lenses">レンズ</a>
          <a href="#gallery">作例</a>
          <a href="#support">サポート</a>
        </nav>
        <a className="aura-a-buy-link" href="#reserve">購入・予約 <ArrowRight size={15} /></a>
      </div>
    </header>
  );
}

function AQuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="aura-a-quick-link" href={href}>{children}<ChevronRight size={15} /></a>;
}

function VersionA() {
  return (
    <div className="aura-page aura-page-a" id="top">
      <AHeader />
      <main>
        <section className="aura-a-hero aura-a-wrap" aria-labelledby="a-hero-title">
          <div className="aura-a-hero-copy">
            <p className="aura-a-kicker">FULL-FRAME MIRRORLESS CAMERA <span>｜</span> 2026</p>
            <h1 id="a-hero-title">AURA X-1</h1>
            <p className="aura-a-subtitle">光を、感情を、そのままに。</p>
            <p className="aura-a-description">45.0メガピクセル・フルサイズセンサー搭載。写真も映像も、ひらめいた瞬間を正確な解像感で残す、AURA初のフラッグシップミラーレスカメラです。</p>
            <div className="aura-a-hero-actions">
              <a className="aura-a-primary-btn" href="#reserve">予約する <ArrowRight size={16} /></a>
              <a className="aura-a-text-btn" href="#overview">製品の詳細を見る <ArrowDown size={16} /></a>
            </div>
            <div className="aura-a-quick-grid" aria-label="ショートカット">
              <AQuickLink href="#specs">主なスペック</AQuickLink>
              <AQuickLink href="#lenses">レンズ互換性</AQuickLink>
              <AQuickLink href="#gallery">作例一覧</AQuickLink>
              <AQuickLink href="#support">サポート</AQuickLink>
            </div>
          </div>
          <div className="aura-a-hero-product">
            <img src={`${ASSET}/aura-hero.jpg`} alt="AURA X-1 ミラーレスカメラ" />
            <div className="aura-a-product-note"><span>NEW</span><span>予約受付中</span></div>
          </div>
        </section>

        <section className="aura-a-overview" id="overview" aria-labelledby="a-overview-title">
          <div className="aura-a-wrap aura-a-section-grid">
            <div>
              <p className="aura-a-section-label">PRODUCT OVERVIEW</p>
              <h2 id="a-overview-title">主なスペック</h2>
              <p className="aura-a-lead">写真の基礎体力を、妥協なく。</p>
            </div>
            <div className="aura-a-stat-grid">
              <article><strong>45.0</strong><span>MP</span><p>フルサイズセンサー</p></article>
              <article><strong>30</strong><span>fps</span><p>電子シャッター連写</p></article>
              <article><strong>469</strong><span>g</span><p>チタンボディ（本体のみ）</p></article>
              <article><strong>6K</strong><span>30p</span><p>10-bit Log動画</p></article>
            </div>
          </div>
        </section>

        <section className="aura-a-features aura-a-wrap" aria-labelledby="a-feature-title">
          <div className="aura-a-section-title-row">
            <div><p className="aura-a-section-label">KEY FEATURES</p><h2 id="a-feature-title">撮るための、確かな進化。</h2></div>
            <a href="#specs">すべての機能を見る <MoveRight size={16} /></a>
          </div>
          <div className="aura-a-feature-list">
            {featureItems.map((feature) => {
              const Icon = feature.icon;
              return <article className="aura-a-feature" key={feature.number}>
                <div className="aura-a-feature-index"><span>{feature.number}</span><Icon size={22} /></div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <a href="#specs">詳しく見る <ChevronRight size={15} /></a>
              </article>;
            })}
          </div>
        </section>

        <section className="aura-a-lenses" id="lenses" aria-labelledby="a-lenses-title">
          <div className="aura-a-wrap aura-a-lenses-grid">
            <div>
              <p className="aura-a-section-label">AURA MOUNT</p>
              <h2 id="a-lenses-title">レンズ互換性</h2>
              <p>AURA Mマウントの全レンズに対応。コンパクトな単焦点から、プロフェッショナルな望遠ズームまで、表現の幅を自由に広げます。</p>
              <div className="aura-a-link-list">
                <a href="#specs">対応レンズ一覧 <ChevronRight size={15} /></a>
                <a href="#support">マウントアダプター <ChevronRight size={15} /></a>
                <a href="#support">レンズ選びガイド <ChevronRight size={15} /></a>
              </div>
            </div>
            <div className="aura-a-compat-table" aria-label="レンズ互換表">
              <div><span>現行Mマウント</span><strong><Check size={16} /> 100% 対応</strong></div>
              <div><span>AF-C / 瞳AF</span><strong><Check size={16} /> 対応</strong></div>
              <div><span>手ブレ補正協調</span><strong><Check size={16} /> 5軸・最大8.0段</strong></div>
            </div>
          </div>
        </section>

        <section className="aura-a-gallery aura-a-wrap" id="gallery" aria-labelledby="a-gallery-title">
          <div className="aura-a-section-title-row">
            <div><p className="aura-a-section-label">AURA STORIES</p><h2 id="a-gallery-title">作例一覧</h2></div>
            <a href="#support">RAWデータをダウンロード <MoveRight size={16} /></a>
          </div>
          <div className="aura-a-gallery-grid">
            {sampleImages.map((image) => <figure key={image.title}>
              <img src={image.src} alt={image.alt} />
              <figcaption><strong>{image.title}</strong><span>{image.meta}</span><a href="#support">撮影データ <ChevronRight size={14} /></a></figcaption>
            </figure>)}
          </div>
        </section>

        <section className="aura-a-specs aura-a-wrap" id="specs" aria-labelledby="a-specs-title">
          <div className="aura-a-section-title-row"><div><p className="aura-a-section-label">TECHNICAL DATA</p><h2 id="a-specs-title">仕様詳細</h2></div><a href="#support">仕様表をダウンロード <MoveRight size={16} /></a></div>
          <dl className="aura-a-spec-grid">
            {specs.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}
          </dl>
          <div className="aura-a-spec-links"><a href="#support">AURA X-1 と X-0 の比較</a><a href="#support">対応アクセサリー</a><a href="#support">使用説明書（PDF）</a></div>
        </section>

        <section className="aura-a-support" id="support" aria-labelledby="a-support-title">
          <div className="aura-a-wrap aura-a-support-grid">
            <div><p className="aura-a-section-label">CUSTOMER SUPPORT</p><h2 id="a-support-title">カスタマーサポート</h2><p>お客様の撮影環境に合わせて、購入前からご使用後までサポートします。</p></div>
            <div className="aura-a-support-links"><a href="#reserve"><CircleHelp size={20} /> よくあるご質問 <ChevronRight size={16} /></a><a href="#reserve"><Menu size={20} /> 製品サポート窓口 <ChevronRight size={16} /></a><a href="#reserve"><Triangle size={20} /> 修理・保証サービス <ChevronRight size={16} /></a></div>
          </div>
        </section>

        <section className="aura-a-reserve aura-a-wrap" id="reserve" aria-labelledby="a-reserve-title">
          <div><p>PRE-ORDER</p><h2 id="a-reserve-title">AURA X-1</h2><span>ボディ単体　<span className="aura-a-price">¥428,000</span>（税込）</span></div>
          <div><p>発売日：2026年11月21日　｜　AURA Care 3年保証付</p><a className="aura-a-primary-btn" href="#top">予約を申し込む <ArrowRight size={16} /></a></div>
        </section>
      </main>
      <footer className="aura-a-footer"><div className="aura-a-wrap"><span>© 2026 AURA IMAGING. This is a fictional product concept.</span><div><a href="#support">利用規約</a><a href="#support">プライバシー</a><a href="#support">お問い合わせ</a></div></div></footer>
    </div>
  );
}

function VersionB() {
  return (
    <div className="aura-page aura-page-b" id="top">
      <header className="aura-b-header">
        <Logo />
        <div className="aura-b-header-right"><a href="#b-essence">魅力を知る</a><a className="aura-b-menu" href="#b-reserve" aria-label="予約セクションへ"><Menu size={21} /></a></div>
      </header>
      <main>
        <section className="aura-b-hero" aria-labelledby="b-hero-title">
          <img src={`${ASSET}/aura-hero.jpg`} alt="暗闇の中で光を受けるAURA X-1" />
          <div className="aura-b-hero-shade" />
          <div className="aura-b-hero-copy">
            <p>AURA X-1 <span>·</span> FULL FRAME MIRRORLESS</p>
            <h1 id="b-hero-title">光を、<br /><em>感情を、</em><br />そのままに。</h1>
            <a className="aura-b-cta" href="#b-reserve">予約する <ArrowRight size={17} /></a>
          </div>
          <div className="aura-b-scroll"><span>SCROLL TO FEEL</span><i /></div>
        </section>

        <section className="aura-b-intro" id="b-essence" aria-labelledby="b-intro-title">
          <p className="aura-b-eyebrow">A QUIET REVOLUTION</p>
          <h2 id="b-intro-title">鮮明さだけでは、<br />捉えきれないものがある。</h2>
          <p className="aura-b-intro-copy">目で見た記憶は、ときに曖昧です。湿った空気の気配。風が止む直前の静けさ。AURA X-1は、解像感のその先にある温度を残すために生まれました。</p>
        </section>

        <section className="aura-b-split-story" aria-label="AURA X-1 の使用シーン">
          <div className="aura-b-split-image"><img src={`${ASSET}/aura-hand.jpg`} alt="夜の街でAURA X-1を手にする人物" /><span>01 / DISTILLED FOR THE MOMENT</span></div>
          <div className="aura-b-split-copy">
            <p className="aura-b-eyebrow">WHEN INSTINCT LEADS</p>
            <h2>考えるより先に、<br />シャッターを切る。</h2>
            <p>469gのチタンボディ。手の中で、呼吸するように馴染む。あなたの視線と、世界とのあいだにある距離を、もっと小さくするために。</p>
            <div className="aura-b-rule"><span>45.0 MP</span><span>469 g</span><span>30 fps</span></div>
          </div>
        </section>

        <section className="aura-b-samples" aria-labelledby="b-samples-title">
          <div className="aura-b-samples-head"><p className="aura-b-eyebrow">AURA STORIES</p><h2 id="b-samples-title">言葉になる前の、<br />美しさを。</h2></div>
          <div className="aura-b-gallery-grid">
            <figure className="aura-b-gallery-large"><img src={`${ASSET}/aura-gallery-coast.jpg`} alt="朝の海岸の作例" /><figcaption>First light <span>— 45mm</span></figcaption></figure>
            <figure><img src={`${ASSET}/aura-gallery-night.jpg`} alt="夜の路地の作例" /><figcaption>After the rain <span>— 35mm</span></figcaption></figure>
            <figure><img src={`${ASSET}/aura-gallery-flower.jpg`} alt="アイリスの作例" /><figcaption>Quiet bloom <span>— 90mm</span></figcaption></figure>
          </div>
        </section>

        <section className="aura-b-performance" aria-labelledby="b-performance-title">
          <div><p className="aura-b-eyebrow">PRECISION, UNSEEN</p><h2 id="b-performance-title">瞬間のすべてに、<br />確かな余白を。</h2></div>
          <div className="aura-b-performance-notes"><article><b>45.0</b><span>MEGAPIXELS</span><p>光の階調まで、静かに描く。</p></article><article><b>779</b><span>AF POINTS</span><p>視線の先に、迷わず寄り添う。</p></article><article><b>6K</b><span>30P VIDEO</span><p>記憶が動き出す瞬間まで。</p></article></div>
        </section>

        <section className="aura-b-reserve" id="b-reserve" aria-labelledby="b-reserve-title">
          <p className="aura-b-eyebrow">AVAILABLE NOVEMBER 2026</p>
          <h2 id="b-reserve-title">あなたの眼差しを、<br /><em>新しい光へ。</em></h2>
          <a className="aura-b-cta" href="#top">AURA X-1 を予約する <ArrowRight size={17} /></a>
          <small>ボディ単体 ¥428,000（税込）　｜　AURA Care 3年保証付</small>
        </section>
      </main>
      <footer className="aura-b-footer"><Logo /><span>© 2026 AURA IMAGING. Fictional product concept.</span><a href="#top">TOP <ArrowRight size={14} /></a></footer>
    </div>
  );
}

export default function Home() {
  const [version, setVersion] = useState<DesignVersion>(() => {
    if (typeof window === "undefined") return "A";
    return new URLSearchParams(window.location.search).get("v")?.toUpperCase() === "B" ? "B" : "A";
  });

  useEffect(() => {
    document.title = `AURA X-1 — ${version === "A" ? "効率・実用型" : "没入・演出型"}`;
  }, [version]);

  const changeVersion = (nextVersion: DesignVersion) => {
    if (nextVersion === version) return;
    setVersion(nextVersion);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 10);
  };

  return (
    <div className="aura-experience">
      <DesignSwitchBar version={version} onChange={changeVersion} />
      <div className="aura-version-stage" key={version}>{version === "A" ? <VersionA /> : <VersionB />}</div>
    </div>
  );
}
