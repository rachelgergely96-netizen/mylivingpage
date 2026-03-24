"use client";

import { useId, useState } from "react";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import type { PageVariant, ResumeData } from "@/types/resume";

interface RecruiterSkimPanelProps {
  pageId: string;
  publicPath: string;
  resumeData: ResumeData;
  variant: PageVariant | null;
  variantId?: string | null;
  fitHeading: string;
  proofPoints: string[];
  featuredProject:
    | {
        name: string;
        description: string;
        tech: string[];
        url: string | null;
      }
    | null;
  ctaEmphasis?: string | null;
}

function toHref(value: string) {
  return value.startsWith("http") ? value : `https://${value}`;
}

export default function RecruiterSkimPanel({
  pageId,
  publicPath,
  resumeData,
  variant,
  variantId = null,
  fitHeading,
  proofPoints,
  featuredProject,
  ctaEmphasis,
}: RecruiterSkimPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const collapsedProofPoints = proofPoints.slice(0, 3);

  return (
    <section
      data-testid="recruiter-skim-panel"
      className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 md:px-8"
    >
      <div className="rounded-[2rem] border border-[rgba(59,130,246,0.2)] bg-[rgba(10,22,40,0.6)] px-4 py-4 shadow-[0_24px_70px_rgba(2,6,23,0.3)] backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
              Recruiter skim
            </p>
            {collapsedProofPoints.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {collapsedProofPoints.map((point) => (
                  <span
                    key={`collapsed-${point}`}
                    className="rounded-full border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] px-3 py-1.5 text-xs text-[#BFDBFE]"
                  >
                    {point}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(10,22,40,0.82)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD] sm:self-center"
          >
            <span>{expanded ? "Collapse recruiter skim" : "Expand recruiter skim"}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        {expanded ? (
          <div
            id={contentId}
            data-testid="recruiter-skim-content"
            className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="font-heading text-2xl font-semibold text-[#F0F4FF] sm:text-3xl">
                  {fitHeading}
                </h2>
                {variant ? (
                  <p className="mt-2 text-sm text-[rgba(240,244,255,0.48)]">
                    Targeted version: {variant.label}
                  </p>
                ) : null}
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.7)]">
                  {resumeData.summary}
                </p>
                {ctaEmphasis ? (
                  <p className="mt-3 inline-flex rounded-full border border-[rgba(229,183,107,0.24)] bg-[rgba(229,183,107,0.08)] px-3 py-1.5 text-xs text-[#F5D7A2]">
                    {ctaEmphasis}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
                <DownloadResumeButton
                  data={resumeData}
                  pageId={pageId}
                  variantId={variantId}
                  className="justify-center"
                />
                {resumeData.email ? (
                  <a
                    href={`mailto:${resumeData.email}`}
                    className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)] sm:text-sm"
                  >
                    Email
                  </a>
                ) : null}
                {resumeData.linkedin ? (
                  <a
                    href={toHref(resumeData.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)] sm:text-sm"
                  >
                    LinkedIn
                  </a>
                ) : null}
                <a
                  href={publicPath}
                  className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)] sm:text-sm"
                >
                  Open current page
                </a>
              </div>
            </div>

            {proofPoints.length > 0 ? (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Top proof
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {proofPoints.map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] px-3 py-1.5 text-xs text-[#BFDBFE]"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {featuredProject ? (
              <div className="mt-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Featured work sample
                </p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="font-heading text-xl text-[#F0F4FF]">{featuredProject.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                      {featuredProject.description}
                    </p>
                    {featuredProject.tech.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredProject.tech.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(6,14,28,0.4)] px-3 py-1 text-xs text-[rgba(240,244,255,0.7)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {featuredProject.url ? (
                    <a
                      href={toHref(featuredProject.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-[rgba(59,130,246,0.28)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      Open project
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div id={contentId} className="sr-only" />
        )}
      </div>
    </section>
  );
}
