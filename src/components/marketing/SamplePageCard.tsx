import LivingPageSectionRail from "@/components/public/LivingPageSectionRail";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ProvenancePlate from "@/components/ui/ProvenancePlate";
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
      className="site-panel overflow-hidden rounded-none bg-site-canvas shadow-[0_22px_54px_-12px_rgba(0,0,0,0.55)]"
      data-example-sample={sample.id}
      data-site-ui
    >
      <div className="overflow-hidden border-b border-site-border">
        <div
          data-example-living-page
          data-living-output
          className="flex flex-col overflow-hidden"
          style={{ height: previewHeight }}
        >
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-site-border-strong bg-site-canvas px-3 py-2"
            data-example-preview-provenance
          >
            <span className="site-badge">Fictional sample</span>
            <span className="text-xs text-site-muted">
              Illustrative profile · not a customer story
            </span>
          </div>
          <ThemeCanvas
            themeId={sample.demo.themeId}
            height="100%"
            className="min-h-0 w-full flex-1 rounded-none"
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
      </div>

      <div className="p-4 sm:p-5">
        <div>
          <h2 className="site-section-title text-2xl sm:text-3xl">{sample.roleLabel}</h2>
          <p className="mt-2 text-sm text-site-muted">
            {sample.demo.data.name} · {sample.demo.data.headline}
          </p>
        </div>

        <ProvenancePlate
          className="mt-5"
          eyebrow="Sample provenance"
          title="Synthetic sample — not a customer story"
          headingLevel="h3"
          description={
            <p>
              Scroll the preview to inspect the full fictional page. Its structure is real; the
              person, claims, and results are made up for illustration.
            </p>
          }
          items={[
            { label: "Profile", value: sample.sampleBadge },
            { label: "Audience", value: sample.audienceLabel },
            {
              label: "Theme",
              value: theme ? `${theme.name} style` : `${sample.demo.themeId} style`,
            },
            {
              label: "Use boundary",
              value: "Send the page when a person can click; keep the résumé for file uploads.",
            },
          ]}
        />
      </div>
    </article>
  );
}
