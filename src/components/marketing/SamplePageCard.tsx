import LivingPageSectionRail from "@/components/public/LivingPageSectionRail";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { getLivingPageSectionIds } from "@/lib/living-page-sections";
import type { ResolvedMarketingSample } from "@/lib/marketing-samples";
import { THEME_MAP } from "@/themes/registry";

interface SamplePageCardProps {
  sample: ResolvedMarketingSample;
  anchorId?: string;
  previewHeight?: number | string;
}

export default function SamplePageCard({
  sample,
  anchorId,
  previewHeight = 420,
}: SamplePageCardProps) {
  const theme = THEME_MAP[sample.demo.themeId];
  const sectionIds = getLivingPageSectionIds(sample.demo.data);

  return (
    <article
      id={anchorId}
      className="site-panel overflow-hidden rounded-2xl bg-site-canvas shadow-[0_22px_54px_-12px_rgba(0,0,0,0.55)]"
      data-example-sample={sample.id}
      data-site-ui
    >
      <div className="overflow-hidden border-b border-site-border">
        <div
          data-example-living-page
          data-living-output
          className="overflow-hidden"
        >
          <ThemeCanvas
            themeId={sample.demo.themeId}
            height="100%"
            className="w-full rounded-none"
            style={{ height: previewHeight }}
            interactive
            motionAware
          >
            <div
              data-analytics-scroll-root="true"
              role="region"
              aria-label={`${sample.demo.data.name} sample Living Page`}
              tabIndex={0}
              className="h-full overflow-y-auto overscroll-contain"
            >
              <LivingPageSectionRail sectionIds={sectionIds} />
              <ResumeLayout
                data={sample.demo.data}
                headingLevel="h2"
                disableExternalLinks
                useExternalScrollRoot
              />
            </div>
          </ThemeCanvas>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-site-border bg-site-canvas-alt px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="site-badge">{sample.sampleBadge}</span>
            {theme ? (
              <span className="text-xs text-site-muted">{theme.name} style</span>
            ) : null}
          </div>
          <p className="text-xs text-site-muted">Scroll to explore the full page</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="site-badge">{sample.audienceLabel}</span>
          <span className="text-xs text-site-muted">Made-up profile</span>
        </div>

        <div className="mt-4">
          <h3 className="site-section-title text-2xl sm:text-3xl">{sample.roleLabel}</h3>
          <p className="mt-2 text-sm text-site-muted">
            {sample.demo.data.name} · {sample.demo.data.headline}
          </p>
        </div>

        <p className="mt-4 border-l-2 border-site-action pl-3 text-sm leading-6 text-site-secondary">
          Send the page when a person can click. Keep your résumé for file uploads.
        </p>
      </div>
    </article>
  );
}
