"use client";

import { useId, useState } from "react";
import DownloadResumeButton from "@/components/DownloadResumeButton";
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
      className="resume-theme mx-auto max-w-4xl px-4 pt-6 sm:px-6 md:px-8"
    >
      <div className="theme-surface-strong rounded-[2rem] border px-4 py-4 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="resume-theme-accent text-[10px] uppercase tracking-[0.18em]">
              Recruiter version
            </p>
            <p className="resume-theme-muted mt-1 text-sm">{variantLabel}</p>
            {visibleChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleChips.map((point) => (
                  <span
                    key={`collapsed-${point}`}
                    className="theme-tag rounded-full border px-3 py-1.5 text-xs"
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
            className="theme-surface resume-theme-link inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors sm:self-center"
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
            className="theme-divider mt-4 border-t pt-4"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                {roleHeading ? (
                  <div>
                    <p className="resume-theme-subtle text-[10px] uppercase tracking-[0.16em]">
                      Target role
                    </p>
                    <h2 className="resume-theme-name mt-2 text-xl font-semibold sm:text-2xl">
                      {roleHeading}
                    </h2>
                  </div>
                ) : null}
                {summary ? (
                  <div>
                    <p className="resume-theme-subtle text-[10px] uppercase tracking-[0.16em]">
                      Opening summary
                    </p>
                    <p className="resume-theme-muted mt-2 max-w-3xl text-sm leading-7">
                      {summary}
                    </p>
                  </div>
                ) : null}
                {ctaEmphasis ? (
                  <p className="theme-tag inline-flex rounded-full border px-3 py-1.5 text-xs">
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
                    className="theme-surface-strong theme-link rounded-full border px-4 py-2.5 text-[13px] transition-transform duration-300 ease-soft hover:-translate-y-0.5 sm:text-sm"
                  >
                    Email
                  </a>
                ) : null}
                {resumeData.linkedin ? (
                  <a
                    href={toHref(resumeData.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-surface-strong theme-link rounded-full border px-4 py-2.5 text-[13px] transition-transform duration-300 ease-soft hover:-translate-y-0.5 sm:text-sm"
                  >
                    LinkedIn
                  </a>
                ) : null}
                <a
                  href={publicPath}
                  className="theme-surface-strong theme-link rounded-full border px-4 py-2.5 text-[13px] transition-transform duration-300 ease-soft hover:-translate-y-0.5 sm:text-sm"
                >
                  Open current page
                </a>
              </div>
            </div>

            {featuredProject ? (
              <div className="theme-surface mt-5 rounded-2xl border p-4">
                <p className="resume-theme-subtle text-[10px] uppercase tracking-[0.16em]">
                  Featured work sample
                </p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="resume-theme-name text-xl">{featuredProject.name}</p>
                    <p className="resume-theme-muted mt-2 text-sm leading-6">
                      {featuredProject.description}
                    </p>
                    {featuredProject.tech.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredProject.tech.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="theme-tag rounded-full border px-3 py-1 text-xs"
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
                      className="theme-link rounded-full border border-[var(--theme-accent-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors"
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
