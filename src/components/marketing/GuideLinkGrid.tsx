import Link from "next/link";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
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
    <ProfileWindow
      title="bulletins://guide-sequence"
      status={`${GUIDES.length} posts`}
      className={className}
      contentClassName="p-5 sm:p-6 md:p-7"
    >
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-heading text-[2rem] font-bold leading-[1.08] tracking-[-0.025em] text-[#F0F4FF] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.7)]">
          {description}
        </p>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {GUIDES.map((guide, index) => (
          <ProfilePanel
            key={guide.slug}
            title={guide.decisionStage}
            meta={`Post ${String(index + 1).padStart(2, "0")}`}
            contentClassName="flex h-full flex-col p-4 sm:p-5"
            as="article"
          >
            <h3>
              <Link
                href={`/guides/${guide.slug}`}
                className="profile-link font-heading text-2xl font-bold leading-tight"
              >
                {guide.title}
              </Link>
            </h3>
            <p className="mt-3 flex-1 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
              {guide.hubSummary}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(125,170,255,0.12)] pt-4 font-mono text-[11px] text-[rgba(240,244,255,0.52)]">
              <span>{guide.readTime}</span>
              <Link
                href={`/guides/${guide.slug}`}
                className="profile-link font-semibold uppercase tracking-[0.1em]"
              >
                Read guide
              </Link>
            </div>
          </ProfilePanel>
        ))}
      </div>
    </ProfileWindow>
  );
}
