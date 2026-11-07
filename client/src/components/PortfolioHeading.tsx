import { BriefcaseBusiness, Camera, FileText, FolderOpen } from "lucide-react";

export function PortfolioHeading({
  eyebrow,
  title,
  description,
  className = "tsuki-subhero",
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  const section = eyebrow.split("/")[0].trim().toUpperCase();
  const Icon = { WORKS: BriefcaseBusiness, GALLERY: Camera, BLOG: FileText }[section] ?? FolderOpen;
  return (
    <section className={`${className} portfolio-page-heading`}>
      <p className="gallery-section-label">{eyebrow}</p>
      <div className="depot-heading-line">
        <h1>{title}</h1>
        <Icon className="depot-heading-icon" size={26} strokeWidth={1.25} aria-hidden="true" focusable="false" />
      </div>
      <p className="portfolio-heading-description">{description}</p>
      <hr className="depot-perforation depot-motion" aria-hidden="true" />
    </section>
  );
}
