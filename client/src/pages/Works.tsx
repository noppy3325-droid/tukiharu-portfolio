import { TiltCard } from "@/components/TiltCard";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { PortfolioHeading } from "@/components/PortfolioHeading";
import { displayWorkUrl, getSafeWorkUrl } from "@/lib/workUrl";

export default function Works() {
  const works = trpc.content.works.list.useQuery();
  return (
    <TsukiLayout>
      <PortfolioHeading
        eyebrow="WORKS / 制作の記録"
        title="作品"
        description="つくったものと、その背景。制作の記録をまとめています。"
      />
      <section
        className="tsuki-content-grid tsuki-work-list"
        aria-label="公開作品"
      >
        {works.isLoading ? (
          <p className="gallery-state" role="status">
            作品を読み込んでいます。
          </p>
        ) : works.isError ? (
          <div className="tsuki-empty" role="alert">
            <p>作品を取得できませんでした。</p>
            <button onClick={() => works.refetch()}>再読み込み</button>
          </div>
        ) : works.data?.length ? (
          works.data.map((work, index) => {
            const workUrl = getSafeWorkUrl(work.url);
            return (
              <TiltCard
                className={`tsuki-glass tsuki-work-card${work.thumbnailUrl ? " has-thumbnail" : ""}`}
                key={work.id}
              >
                {work.thumbnailUrl && (
                  <img
                    className="content-image-thumb"
                    src={work.thumbnailUrl}
                    alt={`${work.title}のサムネイル`}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className="portfolio-work-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="portfolio-work-category">{work.category}</p>
                <h2>{work.title}</h2>
                <div>
                  <p>{work.summary}</p>
                  {workUrl && (
                    <a
                      className="tsuki-work-link"
                      href={workUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${work.title}のリンクを開く`}
                    >
                      <span>{displayWorkUrl(workUrl)}</span>
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </a>
                  )}
                  {work.pdfUrl &&
                    /^\/uploads\/[a-f0-9]+\.pdf$/.test(work.pdfUrl) && (
                      <a
                        className="tsuki-work-link"
                        href={work.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        作品のPDFを開く ↗
                      </a>
                    )}
                </div>
              </TiltCard>
            );
          })
        ) : (
          <div className="tsuki-empty tsuki-glass">
            <BriefcaseBusiness size={25} />
            <p>作品を準備しています。公開されると、ここに並びます。</p>
          </div>
        )}
      </section>
    </TsukiLayout>
  );
}
