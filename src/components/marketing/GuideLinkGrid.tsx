import React from "react";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

interface GuideLinkGridProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  id?: string;
}

const DECISION_PATH_STAGES = [
  { label: "Résumé PDF", action: "Check the file" },
  { label: "Recruiter language", action: "Match honest search terms" },
  { label: "Living Page", action: "Add context after the click" },
] as const;

export default function GuideLinkGrid({
  eyebrow,
  title,
  description,
  className = "",
  id,
}: GuideLinkGridProps) {
  return (
    <section id={id} className={`site-panel px-5 py-8 sm:px-8 sm:py-10 ${className}`.trim()} data-site-ui>
      <div className="max-w-3xl">
        <p className="site-eyebrow">{eyebrow}</p>
        <h2 className="site-section-title mt-3">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-site-secondary">{description}</p>
      </div>

      <ol
        className="mt-8 grid gap-px bg-site-border lg:grid-cols-3"
        aria-label="Decision path from résumé file to Living Page"
        data-guide-decision-path
      >
        {GUIDES.map((guide, index) => {
          const stage = DECISION_PATH_STAGES[index];

          return (
            <li key={guide.slug} className="flex bg-site-surface" data-guide-decision-step>
              <article className="flex w-full flex-col p-5">
                {stage ? (
                  <div className="flex items-center justify-between gap-3 border-b border-site-border pb-4">
                    <div>
                      <p className="font-mono text-xs font-semibold text-site-action">
                        {String(index + 1).padStart(2, "0")} / {stage.label}
                      </p>
                      <p className="mt-1 text-xs text-site-muted">{stage.action}</p>
                    </div>
                    <span aria-hidden="true" className="text-lg text-site-action">
                      {index < GUIDES.length - 1 ? "→" : "✓"}
                    </span>
                  </div>
                ) : null}
                <p className="site-eyebrow mt-5">{guide.decisionStage}</p>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="site-panel-title mt-3 block transition-colors hover:text-site-action-hover"
                >
                  {guide.title}
                </Link>
                <p className="mt-3 flex-1 text-sm leading-7 text-site-secondary">
                  {guide.hubSummary}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-site-border pt-4 text-xs text-site-muted">
                  <span>{guide.readTime}</span>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="font-semibold text-site-action transition-colors hover:text-site-action-hover"
                  >
                    Read guide
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
