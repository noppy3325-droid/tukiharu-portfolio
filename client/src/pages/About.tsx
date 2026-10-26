import { TsukiLayout } from "@/components/TsukiLayout";
import { trpc } from "@/lib/trpc";
import { TiltCard } from "@/components/TiltCard";
import { MusicLibrary } from "@/components/MusicLibrary";
import { DeviceCard } from "@/components/DeviceCard";
import { defaultProfile } from "@shared/profile";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const BoardingPass = lazy(() => import("@/components/BoardingPass"));

const profileSections = [
  { id: "about", label: "About", mobileLabel: "私について" },
  { id: "interests", label: "Interests", mobileLabel: "好きなもの" },
  { id: "pc-environment", label: "Gear", mobileLabel: "使用機材" },
  { id: "music", label: "Music", mobileLabel: "音楽" },
  { id: "activity", label: "Activity", mobileLabel: "活動のあしあと" },
  { id: "links", label: "Links", mobileLabel: "リンク" },
];

function External({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (!/^https:\/\//i.test(href)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}
function Tags({ values }: { values: string[] }) {
  return (
    <div className="profile-tags">
      {values.map((v, i) => (
        <span key={`${v}-${i}`}>{v}</span>
      ))}
    </div>
  );
}
function Empty() {
  return <p className="profile-empty">少しずつ、記録を増やしています。</p>;
}

export default function About() {
  const query = trpc.content.profile.get.useQuery(undefined, {
    staleTime: 60_000,
  });
  const p = query.data ?? defaultProfile;
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketLoaded, setTicketLoaded] = useState(false);
  const ticketTrigger = useRef<HTMLButtonElement | null>(null);
  const issueTicket = (event: React.MouseEvent<HTMLButtonElement>) => {
    ticketTrigger.current = event.currentTarget;
    setTicketLoaded(true);
    setTicketOpen(true);
  };
  useEffect(() => {
    document.title = `${p.name}について｜月春の資材置き場`;
  }, [p.name]);
  const activity = [...p.activities].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  return (
    <TsukiLayout>
      <div className="profile-page">
        <a href="/" className="profile-back">
          <ArrowLeft size={15} />
          Homeへ戻る
        </a>
        {query.isLoading && (
          <p role="status">プロフィールを読み込んでいます。</p>
        )}
        {query.isError && (
          <p role="alert">
            プロフィールを取得できませんでした。
            <button onClick={() => query.refetch()}>再読み込み</button>
          </p>
        )}
        <TiltCard className="profile-header">
          <button type="button" className="profile-avatar profile-ticket-trigger" aria-label={`${p.name}のアイコンからプロフィール搭乗券を発行`} aria-haspopup="dialog" onClick={issueTicket}>
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={`${p.name}のプロフィール`} />
            ) : (
              <span aria-hidden="true">月</span>
            )}
          </button>
          <div>
            <p className="gallery-section-label">HELLO, I'M</p>
            <h1><button type="button" className="profile-ticket-name" aria-label={`${p.name}のプロフィール搭乗券を発行`} aria-haspopup="dialog" onClick={issueTicket}>{p.name}<span>搭乗券を発行 <ArrowUpRight size={13} aria-hidden="true" /></span></button></h1>
            <p className="profile-headline">{p.headline}</p>
            <p className="profile-introduction">{p.introduction}</p>
            <div className="profile-socials">
              <External href={p.githubUrl}>
                <Github size={16} />
                GitHub
              </External>
              <External href={p.xUrl}>X</External>
            </div>
          </div>
        </TiltCard>
        {ticketLoaded && <Suspense fallback={<p role="status">搭乗券を準備しています…</p>}><BoardingPass profile={p} open={ticketOpen} onOpenChange={setTicketOpen} returnFocus={() => ticketTrigger.current?.focus()} /></Suspense>}
        <nav className="profile-index" aria-label="自己紹介のセクション">
          {profileSections.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              data-page-transition-off
            >
              {section.label}
            </a>
          ))}
        </nav>
        <details className="profile-mobile-index">
          <summary>このページの目次</summary>
          <nav aria-label="自己紹介の目次">
            {profileSections.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                data-page-transition-off
              >
                {section.mobileLabel}
              </a>
            ))}
          </nav>
        </details>
        <section id="about" className="profile-section">
          <p className="gallery-section-label">01 / ABOUT</p>
          <h2>私について</h2>
          {p.about ? <p className="profile-prose">{p.about}</p> : <Empty />}
        </section>
        <section id="interests" className="profile-section">
          <p className="gallery-section-label">02 / INTERESTS</p>
          <h2>好きなもの</h2>
          <div className="interest-grid">
            {p.interests.map((item, i) => (
              <div className={`interest-group interest-tone-${i % 3}`} key={i}>
                <span className="interest-number">0{i + 1}</span>
                <h3>{item.category}</h3>
                <Tags values={item.items} />
              </div>
            ))}
          </div>
          {!p.interests.length && <Empty />}
        </section>
        <section id="pc-environment" className="profile-section">
          <p className="gallery-section-label">03 / GEAR</p>
          <h2>使っている機材</h2>
          <div className="device-grid">
            {p.devices.map((device, i) => (
              <DeviceCard key={i} device={device} index={i} />
            ))}
          </div>
          {!p.devices.length && <Empty />}
        </section>
        <section id="music" className="profile-section">
          <p className="gallery-section-label">04 / MUSIC</p>
          <h2>日々に流れる音楽</h2>
          <MusicLibrary items={p.music} />
          {!p.music.length && <Empty />}
        </section>
        <section id="activity" className="profile-section">
          <p className="gallery-section-label">05 / ACTIVITY</p>
          <h2>活動のあしあと</h2>
          <ol className="activity-timeline">
            {activity.map(item => (
              <li key={item.id}>
                <time dateTime={item.date}>
                  {item.date.replaceAll("-", ".")}
                </time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <External href={item.url}>関連情報</External>
                </div>
              </li>
            ))}
          </ol>
          {!activity.length && <Empty />}
        </section>
        <section id="links" className="profile-section">
          <p className="gallery-section-label">06 / LINKS</p>
          <h2>ほかの場所でも</h2>
          <div className="profile-links">
            {[
              { label: "GitHub", url: p.githubUrl },
              { label: "X", url: p.xUrl },
              ...p.links,
            ]
              .filter(item => item.url)
              .map((item, i) => (
                <External key={i} href={item.url}>
                  {item.label}
                </External>
              ))}
          </div>
        </section>
        <aside className="profile-privacy" aria-labelledby="profile-privacy-title">
          <h2 id="profile-privacy-title">搭乗券とプライバシーについて</h2>
          <p>プロフィール搭乗券を開いたときだけ、接続元のIPアドレスを<a href="https://ipwhois.io/" target="_blank" rel="noopener noreferrer">IPWhois</a>へ送信し、おおよその都市・地域を取得します。GPSによる現在地の取得は行いません。</p>
          <p>取得した地域は搭乗券の出発地表示だけに使い、広告・アクセス解析など、ほかの目的には利用しません。この機能から、IPWhois以外の第三者へIPアドレスや取得した地域を提供することもありません。</p>
          <p>再照会を減らすため、取得した地域を非公開のセッション内に一時的に保持します。取得した地域をプロフィールや投稿として保存することはありません。推定した地域は、VPNや通信回線によって実際の場所と異なる場合があります。</p>
        </aside>
      </div>
    </TsukiLayout>
  );
}
