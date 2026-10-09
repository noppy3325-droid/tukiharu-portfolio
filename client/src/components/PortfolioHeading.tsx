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
  return (
    <section className={`${className} portfolio-page-heading`}>
      <p className="gallery-section-label">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="portfolio-heading-description">{description}</p>
    </section>
  );
}
