import { TsukiLayout } from "@/components/TsukiLayout";
import { trpc } from "@/lib/trpc";
import { TiltCard } from "@/components/TiltCard";
import { defaultProfile } from "@shared/profile";
import {
  ArrowLeft,
  ArrowUpRight,
  Github,
  Monitor,
  Music2,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";

const profileSections = [
  { id: "about", label: "About", mobileLabel: "私について" },
  { id: "skills", label: "Skills", mobileLabel: "できること" },
  { id: "interests", label: "Interests", mobileLabel: "好きなもの" },
  { id: "personal", label: "Personal", mobileLabel: "こんな人です" },
  { id: "pc-environment", label: "PC Environment", mobileLabel: "制作環境" },
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
          <div className="profile-avatar">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={`${p.name}のプロフィール`} />
            ) : (
              <span aria-hidden="true">月</span>
            )}
          </div>
          <div>
            <p className="gallery-section-label">HELLO, I'M</p>
            <h1>{p.name}</h1>
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
        <div className="profile-columns">
          <section id="about" className="profile-section">
            <p className="gallery-section-label">01 / ABOUT</p>
            <h2>私について</h2>
            {p.about ? <p className="profile-prose">{p.about}</p> : <Empty />}
          </section>
          <section id="skills" className="profile-section">
            <p className="gallery-section-label">02 / SKILLS</p>
            <h2>できること、学んでいること</h2>
            {p.skills.length ? <Tags values={p.skills} /> : <Empty />}
          </section>
        </div>
        <section id="interests" className="profile-section">
          <p className="gallery-section-label">03 / INTERESTS</p>
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
        <section id="personal" className="profile-section">
          <p className="gallery-section-label">04 / PERSONAL</p>
          <h2>
            <Sparkles size={21} />
            こんな人です
          </h2>
          <ul className="personal-notes">
            {p.personal.map((item, i) => (
              <li key={i}>
                <span>✦</span>
                {item}
              </li>
            ))}
          </ul>
          {!p.personal.length && <Empty />}
        </section>
        <section id="pc-environment" className="profile-section">
          <p className="gallery-section-label">05 / PC ENVIRONMENT</p>
          <h2>日々の制作環境</h2>
          <div className="device-grid">
            {p.devices.map((device, i) => (
              <article className="device-panel" key={i}>
                <div className="device-visual">
                  {device.imageUrl ? (
                    <img
                      loading="lazy"
                      src={device.imageUrl}
                      alt={device.name}
                    />
                  ) : (
                    <Monitor size={64} strokeWidth={1} />
                  )}
                </div>
                <div className="device-copy">
                  <p className="device-status">
                    MY WORKSPACE / {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3>{device.name}</h3>
                  <dl>
                    {[
                      ["OS", device.os],
                      ["CPU", device.cpu],
                      ["MEMORY", device.memory],
                      ["STORAGE", device.storage],
                    ]
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {device.software && (
                    <p className="device-software">{device.software}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!p.devices.length && <Empty />}
        </section>
        <section id="music" className="profile-section">
          <p className="gallery-section-label">06 / MUSIC</p>
          <h2>日々に流れる音楽</h2>
          <div className="music-library">
            {p.music.map((item, i) => (
              <article className="music-record" key={i}>
                <div className="music-artwork">
                  {item.artworkUrl ? (
                    <img
                      loading="lazy"
                      src={item.artworkUrl}
                      alt={`${item.title}のジャケット`}
                    />
                  ) : (
                    <Music2 size={40} />
                  )}
                </div>
                <div>
                  <small>{item.genre}</small>
                  <h3>{item.title}</h3>
                  <p>{item.artist}</p>
                  {item.note && <p className="music-note">{item.note}</p>}
                  <External href={item.url}>楽曲・ライブラリを開く</External>
                </div>
                <span className="music-bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </article>
            ))}
          </div>
          {!p.music.length && <Empty />}
        </section>
        <section id="activity" className="profile-section">
          <p className="gallery-section-label">07 / ACTIVITY</p>
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
          <p className="gallery-section-label">08 / LINKS</p>
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
      </div>
    </TsukiLayout>
  );
}
