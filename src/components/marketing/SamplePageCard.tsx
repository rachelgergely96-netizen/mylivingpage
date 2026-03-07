import Link from "next/link";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import type { ResolvedMarketingSample } from "@/lib/marketing-samples";
import { THEME_MAP } from "@/themes/registry";

interface SamplePageCardProps {
  sample: ResolvedMarketingSample;
  signupHref: string;
  previewHref?: string;
  anchorId?: string;
  interactivePreview?: boolean;
}

export default function SamplePageCard({
  sample,
  signupHref,
  previewHref,
  anchorId,
  interactivePreview = false,
}: SamplePageCardProps) {
  const theme = THEME_MAP[sample.demo.themeId];

  return (
    <article
      id={anchorId}
      className="group overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.52)] shadow-[0_30px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-1 hover:border-[rgba(59,130,246,0.22)]"
    >
      <div className="relative overflow-hidden border-b border-[rgba(255,255,255,0.08)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4">
          <span className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(10,22,40,0.72)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#BFDBFE] backdrop-blur-xl">
            {sample.sampleBadge}
          </span>
          {theme ? (
            <span className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(10,22,40,0.72)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.58)] backdrop-blur-xl">
              {theme.name}
            </span>
          ) : null}
        </div>
        <ThemeCanvas
          themeId={sample.demo.themeId}
          height={330}
          className="h-[330px] w-full rounded-none"
          interactive={interactivePreview}
        >
          <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.62)_100%)]">
            <ResumeLayout data={sample.demo.data} compact headingLevel="h2" />
          </div>
        </ThemeCanvas>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
            {sample.audienceLabel}
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.34)]">
            {sample.roleLabel}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="font-heading text-2xl font-bold text-[#F0F4FF]">
            {sample.demo.data.name}
          </h3>
          <p className="mt-1 text-sm text-[rgba(240,244,255,0.58)]">{sample.demo.data.headline}</p>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-7 text-[rgba(240,244,255,0.64)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Search moment</p>
            <p className="mt-1">{sample.searchMoment}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Why this page helps</p>
            <p className="mt-1">{sample.whyItWorks}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Best for</p>
            <p className="mt-1">{sample.intendedUse}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={signupHref}
            className="gold-pill inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.3)]"
          >
            Build a page like this
          </Link>
          {previewHref ? (
            <Link
              href={previewHref}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.54)] transition-colors hover:text-[#93C5FD]"
            >
              See this sample in context
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
