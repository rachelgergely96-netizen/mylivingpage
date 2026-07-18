import Link from "next/link";
import { GUIDES } from "@/lib/guides";

interface GuideLinkGridProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}

export default function GuideLinkGrid({
  eyebrow,
  title,
  description,
  className = "",
}: GuideLinkGridProps) {
  return (
    <section className={`site-panel px-5 py-8 sm:px-8 sm:py-10 ${className}`.trim()} data-site-ui>
      <div className="max-w-3xl">
        <p className="site-eyebrow">{eyebrow}</p>
        <h2 className="site-section-title mt-3">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-site-secondary">{description}</p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="border border-site-border bg-site-canvas-alt p-5"
          >
            <p className="site-eyebrow">{guide.decisionStage}</p>
            <Link
              href={`/guides/${guide.slug}`}
              className="site-panel-title mt-3 block transition-colors hover:text-site-action-hover"
            >
              {guide.title}
            </Link>
            <p className="mt-3 text-sm leading-7 text-site-secondary">{guide.hubSummary}</p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-site-border pt-4 text-xs text-site-muted">
              <span>{guide.readTime}</span>
              <Link
                href={`/guides/${guide.slug}`}
                className="font-semibold text-site-action transition-colors hover:text-site-action-hover"
              >
                Read guide
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
