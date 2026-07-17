import Image from "next/image";
import { DEMO_PAGES } from "@/lib/demo-data";
import {
  buildQrDataUrl,
  getShareCardTags,
  getShareCardVisual,
  normalizeAppUrl,
  toDisplayDomainUrl,
  toLivePageUrl,
  truncate,
} from "@/lib/share-card";
import { slugifyUsername } from "@/lib/usernames";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

interface LandingStoryShareCardProps {
  data?: ResumeData;
  headingLevel?: "h2" | "h3";
  qrLabel?: string;
  sharePath?: `/${string}`;
  themeId: ThemeId;
}

const STORY_RESUME = DEMO_PAGES[0]?.data;

export function LandingStoryShareCard({
  data = STORY_RESUME,
  headingLevel = "h3",
  qrLabel = "Scan to open the full page",
  sharePath,
  themeId,
}: LandingStoryShareCardProps) {
  if (!data) {
    return null;
  }

  const slug = slugifyUsername(data.name || "member");
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const livePageUrl = sharePath
    ? new URL(sharePath, `${appUrl}/`).toString()
    : toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(
    sharePath ? livePageUrl.replace(/^https?:\/\//, "") : toDisplayDomainUrl(appUrl, slug),
    36,
  );
  const visual = getShareCardVisual(themeId);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const tags = getShareCardTags(data);
  const name = truncate(data.name || "MyLivingPage User", 34);
  const headline = truncate(data.headline || "Professional profile", 60);
  const Heading = headingLevel;

  return (
    <article
      data-testid="story-share-card"
      data-theme-id={themeId}
      className="relative overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.14)] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.46)] sm:p-5"
      style={{
        background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 70px ${visual.glow}`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full"
        style={{ background: `radial-gradient(circle, ${visual.glow} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.5)] sm:text-[10px]">
            Share card
          </p>
          <Heading className="mt-2 truncate font-heading text-xl font-bold text-[#F0F4FF] sm:text-3xl">
            {name}
          </Heading>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[rgba(240,244,255,0.74)] sm:text-sm">
            {headline}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold text-[#07111F] shadow-[0_10px_28px_rgba(0,0,0,0.25)] sm:h-14 sm:w-14 sm:text-xl"
          style={{ background: `linear-gradient(135deg, ${visual.accent}, #E2E8F0)` }}
        >
          {name.slice(0, 1).toUpperCase() || "?"}
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(5,12,24,0.38)] px-2 py-1 text-[9px] text-[rgba(240,244,255,0.74)] sm:px-2.5 sm:text-[10px]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 rounded-[1rem] border border-[rgba(255,255,255,0.1)] bg-[rgba(5,12,24,0.48)] p-3 sm:grid-cols-[minmax(0,1fr)_92px] sm:p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[#F0F4FF] sm:text-xs">{qrLabel}</p>
          <p className="mt-1 truncate font-mono text-[8px] text-[rgba(240,244,255,0.46)] sm:text-[10px]">
            {displayUrl}
          </p>
        </div>
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt={`QR code preview for ${displayUrl}`}
            width={92}
            height={92}
            unoptimized
            className="h-[72px] w-[72px] rounded-xl bg-white p-1.5 sm:h-[92px] sm:w-[92px]"
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-xl bg-white/10 sm:h-[92px] sm:w-[92px]" />
        )}
      </div>

      <div
        className="relative mt-3 flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] sm:mt-4 sm:text-[9px]"
        aria-label="Share options included with the finished card"
      >
        <span className="rounded-full border border-[rgba(59,130,246,0.32)] bg-[rgba(59,130,246,0.12)] px-2.5 py-1 text-[#BFDBFE]">
          Link included
        </span>
        <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-[rgba(240,244,255,0.5)]">
          PNG export
        </span>
      </div>
    </article>
  );
}
