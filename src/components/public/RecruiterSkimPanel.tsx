"use client";

import { useId, useState } from "react";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import type { ResumeData } from "@/types/resume";

interface RecruiterSkimPanelProps {
  pageId: string;
  publicPath: string;
  resumeData: ResumeData;
  variantLabel: string;
  variantId?: string | null;
  collapsedChips: string[];
  roleHeading?: string | null;
  summary?: string | null;
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
  variantLabel,
  variantId = null,
  collapsedChips,
  roleHeading = null,
  summary = null,
  featuredProject,
  ctaEmphasis,
}: RecruiterSkimPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const visibleChips = collapsedChips.slice(0, 3);

  return (
    <section
      data-testid="recruiter-skim-panel"
      className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 md:px-8"
    >
      <ProfileWindow
        title="Recruiter version"
        status={<span className="profile-status">{expanded ? "Expanded" : "Collapsed"}</span>}
        as="div"
        contentClassName="p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold text-[#F0F4FF]">{variantLabel}</p>
            {visibleChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleChips.map((point) => (
                  <span
                    key={`collapsed-${point}`}
                    className="rounded-md border border-[rgba(125,170,255,0.2)] bg-[rgba(59,130,246,0.1)] px-2.5 py-1.5 font-mono text-[11px] leading-5 text-[#BFDBFE]"
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
            className="profile-action inline-flex shrink-0 items-center gap-2 self-start px-4 py-2 text-xs uppercase tracking-[0.12em] sm:self-center"
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
            className="mt-4 border-t border-[rgba(125,170,255,0.14)] pt-4"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                {roleHeading ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                      Target role
                    </p>
                    <h2 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF] sm:text-2xl">
                      {roleHeading}
                    </h2>
                  </div>
                ) : null}
                {summary ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                      Opening summary
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.7)]">
                      {summary}
                    </p>
                  </div>
                ) : null}
                {ctaEmphasis ? (
                  <p className="inline-flex rounded-md border border-[rgba(147,197,253,0.26)] bg-[rgba(59,130,246,0.1)] px-3 py-2 text-xs leading-5 text-[#BFDBFE]">
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
                    className="profile-action px-4 py-2.5 text-[13px] sm:text-sm"
                  >
                    Email
                  </a>
                ) : null}
                {resumeData.linkedin ? (
                  <a
                    href={toHref(resumeData.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-action px-4 py-2.5 text-[13px] sm:text-sm"
                  >
                    LinkedIn
                  </a>
                ) : null}
                <a
                  href={publicPath}
                  className="profile-action px-4 py-2.5 text-[13px] sm:text-sm"
                >
                  Open current page
                </a>
              </div>
            </div>

            {featuredProject ? (
              <ProfilePanel
                title="Featured work sample"
                className="mt-5"
                contentClassName="p-4"
                as="div"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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
                            className="rounded-md border border-[rgba(125,170,255,0.14)] bg-[rgba(3,10,23,0.4)] px-2.5 py-1 font-mono text-[11px] text-[rgba(240,244,255,0.7)]"
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
                      className="profile-action shrink-0 px-4 py-2 text-xs uppercase tracking-[0.12em]"
                    >
                      Open project
                    </a>
                  ) : null}
                </div>
              </ProfilePanel>
            ) : null}
          </div>
        ) : (
          <div id={contentId} className="sr-only" />
        )}
      </ProfileWindow>
    </section>
  );
}
