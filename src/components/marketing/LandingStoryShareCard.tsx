import { ScaledShareCardArtwork } from "@/components/ScaledShareCardArtwork";
import TiltCard from "@/components/marketing/TiltCard";
import { DEMO_PAGES } from "@/lib/demo-data";
import {
  buildShareCardModel,
  getShareCardVisual,
  normalizeAppUrl,
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
  qrLabel = "Open the full living page",
  sharePath,
  themeId,
}: LandingStoryShareCardProps) {
  if (!data) {
    return null;
  }

  const slug = slugifyUsername(data.name || "member");
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const liveUrl = sharePath
    ? new URL(sharePath, `${appUrl}/`).toString()
    : undefined;
  const model = buildShareCardModel({
    appUrl,
    liveUrl,
    resume: data,
    slug,
  });
  const visual = getShareCardVisual(themeId);
  const Heading = headingLevel;

  return (
    <article
      data-testid="story-share-card"
      data-theme-id={visual.themeId}
      data-theme-detail={visual.contentProfile}
      data-theme-collection={visual.collection}
      data-share-card-material="refractive-glass"
      data-share-card-preview-stage
      className="share-card-premium-stage relative min-w-0 overflow-visible border p-2 sm:p-3"
    >
      <Heading className="sr-only">
        {model.name}&rsquo;s {visual.themeName} share card
      </Heading>
      <TiltCard lift={14} max={5} targetSelector="[data-share-card-panel]">
        <ScaledShareCardArtwork
          animatedShine
          ctaHeadline={qrLabel}
          finish="holographic"
          frameClassName="w-full"
          model={model}
          visual={visual}
        />
      </TiltCard>
    </article>
  );
}
