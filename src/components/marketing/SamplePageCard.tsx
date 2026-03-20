"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  previewHeight?: number;
}

export default function SamplePageCard({
  sample,
  signupHref,
  previewHref,
  anchorId,
  interactivePreview = false,
  previewHeight = 380,
}: SamplePageCardProps) {
  const theme = THEME_MAP[sample.demo.themeId];
  const [openPreview, setOpenPreview] = useState(false);

  useEffect(() => {
    if (!openPreview) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPreview(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openPreview]);

  return (
    <>
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
          <button
            type="button"
            onClick={() => setOpenPreview(true)}
            className="absolute right-4 top-16 z-20 rounded-full border border-[rgba(229,183,107,0.28)] bg-[rgba(8,14,28,0.82)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F5D7A2] transition-colors hover:border-[rgba(229,183,107,0.5)] hover:text-[#FFF3DE]"
          >
            Open large preview
          </button>
          <ThemeCanvas
            themeId={sample.demo.themeId}
            height={previewHeight}
            className="w-full rounded-none"
            style={{ height: previewHeight }}
            interactive={interactivePreview}
          >
            <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.62)_100%)]">
              <ResumeLayout data={sample.demo.data} compact headingLevel="h2" disableExternalLinks />
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
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Best used after</p>
              <p className="mt-1">{sample.bestUsedAfter}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Why this helps a human</p>
              <p className="mt-1">{sample.humanBenefit}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6]">Keep the resume for</p>
              <p className="mt-1">{sample.resumeBoundary}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={signupHref}
              className="gold-pill inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.3)]"
            >
              Start Your Free Month
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

      {openPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,8,16,0.82)] p-4 backdrop-blur-sm"
          onClick={() => setOpenPreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${sample.demo.data.name} sample preview`}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[rgba(6,12,24,0.96)] shadow-[0_40px_120px_rgba(0,0,0,0.48)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#E5B76B]">Large preview</p>
                <h3 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF]">{sample.demo.data.name}</h3>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.58)]">{sample.demo.data.headline}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenPreview(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[rgba(240,244,255,0.6)] transition-colors hover:border-[rgba(229,183,107,0.4)] hover:text-[#FFF3DE]"
                aria-label="Close large preview"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(255,255,255,0.08)]">
                <ThemeCanvas themeId={sample.demo.themeId} height="min(82vh, 920px)" className="rounded-none" interactive>
                  <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.6)_100%)]">
                    <ResumeLayout data={sample.demo.data} disableExternalLinks />
                  </div>
                </ThemeCanvas>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={signupHref}
                  className="gold-pill px-5 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.3)]"
                >
                  Start Your Free Month
                </Link>
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="rounded-full border border-[rgba(255,255,255,0.14)] px-5 py-3 text-sm font-semibold text-[rgba(240,244,255,0.72)] transition-colors hover:border-[rgba(229,183,107,0.34)] hover:text-[#FFF3DE]"
                >
                  Back to samples
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
