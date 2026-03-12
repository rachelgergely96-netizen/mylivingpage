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
    <section className={`glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-8 sm:py-10 ${className}`.trim()}>
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">{eyebrow}</p>
        <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.64)]">{description}</p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">{guide.decisionStage}</p>
            <Link
              href={`/guides/${guide.slug}`}
              className="mt-3 block font-heading text-2xl font-bold leading-tight text-[#F0F4FF] transition-colors hover:text-[#BFDBFE]"
            >
              {guide.title}
            </Link>
            <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">{guide.hubSummary}</p>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[rgba(240,244,255,0.42)]">
              <span>{guide.readTime}</span>
              <Link
                href={`/guides/${guide.slug}`}
                className="font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
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
