import { useLocale } from "@/contexts/LocaleContext";
import { TiltCard } from "@/components/TiltCard";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";
import { PortfolioHeading } from "@/components/PortfolioHeading";
import { displayWorkUrl, getSafeWorkUrl } from "@/lib/workUrl";

export default function Works() {
  const { t, locale } = useLocale();
  const works = trpc.content.works.list.useQuery();
  return (
    <TsukiLayout>
      <PortfolioHeading
        eyebrow={t("WORKS / 制作の記録")}
        title={t("作品")}
        description={t("制作したアプリやツールを、スクリーンショットと概要で紹介します。")}
      />
      <section
        className="tsuki-content-grid tsuki-work-list"
        aria-label={t("公開作品")}
      >
        {works.isLoading ? (
          <p className="gallery-state" role="status">{t("作品を読み込んでいます。")}</p>
        ) : works.isError ? (
          <div className="tsuki-empty" role="alert">
            <p>{t("作品を取得できませんでした。")}</p>
            <button onClick={() => works.refetch()}>{t("再読み込み")}</button>
          </div>
        ) : works.data?.length ? (
          works.data.map((work, index) => {
            const workUrl = getSafeWorkUrl(work.url);
            return (
              <TiltCard
                className={`tsuki-glass tsuki-work-card depot-drawer depot-motion${work.thumbnailUrl ? " has-thumbnail" : ""}`}
                key={work.id}
              >
                {work.thumbnailUrl && (
                  <img
                    className="content-image-thumb"
                    src={work.thumbnailUrl}
                    alt={locale === "ja" ? `${work.title}のサムネイル` : `Thumbnail: ${work.title}`}
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
                      className="tsuki-work-link depot-pencil-link depot-motion"
                      href={workUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={locale === "ja" ? `${work.title}のリンクを開く` : `Open ${work.title}`}
                    >
                      <span>{displayWorkUrl(workUrl)}</span>
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </a>
                  )}
                  {work.pdfUrl &&
                    /^\/uploads\/[a-f0-9]+\.pdf$/.test(work.pdfUrl) && (
                      <a
                        className="tsuki-work-link depot-pencil-link depot-motion"
                        href={work.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >{t("作品のPDFを開く ↗")}</a>
                    )}
                </div>
              </TiltCard>
            );
          })
        ) : (
          <div className="tsuki-empty tsuki-glass">
            <BriefcaseBusiness size={25} />
            <p>{t("作品を準備しています。公開されると、ここに並びます。")}</p>
          </div>
        )}
      </section>
    </TsukiLayout>
  );
}
