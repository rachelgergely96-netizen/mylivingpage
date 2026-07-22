import React from "react";
import type { DecisionReadinessState } from "@/types/resume";

const READINESS_SECTION_BY_CHECK: Record<string, { href: string; label: string }> = {
  target_role: { href: "#editor-section-profile", label: "Profile" },
  quantified_proof: { href: "#editor-section-stats", label: "Impact" },
  top_summary: { href: "#editor-section-summary", label: "Intro" },
  contact_surface: { href: "#editor-section-profile", label: "Profile" },
  resume_pdf_health: { href: "#editor-section-ats", label: "ATS check" },
  mobile_readability: { href: "#editor-section-summary", label: "Intro" },
};

export function getReadinessSection(checkId: string) {
  return READINESS_SECTION_BY_CHECK[checkId] ?? {
    href: "#editor-section-profile",
    label: "Profile",
  };
}

interface EditorReadinessBriefingProps {
  readiness: DecisionReadinessState;
}

export default function EditorReadinessBriefing({
  readiness,
}: EditorReadinessBriefingProps) {
  const nextCheck = readiness.checks.find(
    (check) => check.status === "needs_attention",
  );
  const nextTarget = nextCheck ? getReadinessSection(nextCheck.id) : null;
  const isReady = readiness.overallStatus === "ready";

  return (
    <section
      aria-labelledby="editor-readiness-title"
      data-editor-readiness
      className={`editor-signal-frame relative overflow-hidden border px-4 py-5 sm:px-5 ${
        isReady
          ? "border-site-success bg-[color-mix(in_srgb,var(--site-success)_8%,var(--site-surface))]"
          : "border-site-action bg-[color-mix(in_srgb,var(--site-action)_7%,var(--site-surface))]"
      }`}
    >
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
        <div className="min-w-0">
          <p className="site-eyebrow">{isReady ? "Ready signal" : "Next signal"}</p>
          <h2
            id="editor-readiness-title"
            className="mt-2 font-site text-xl font-semibold tracking-[-0.03em] text-site-text sm:text-2xl"
          >
            {nextCheck?.title ?? "Your page is ready for a real decision moment"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-site-secondary">
            {nextCheck?.detail ?? readiness.summary}
          </p>
          {nextTarget ? (
            <a
              href={nextTarget.href}
              className="mt-4 inline-flex min-h-10 items-center gap-2 border-b border-site-action pb-1 text-xs font-semibold text-site-action-hover transition-colors hover:border-site-action-hover hover:text-site-text"
            >
              Improve {nextTarget.label}
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p className="mt-4 text-xs font-semibold text-site-success">
              Save, copy your link, and send it
            </p>
          )}
        </div>

        <div className="border-l border-site-border pl-4 sm:pl-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="site-eyebrow text-[9px] text-site-muted">
                Decision readiness
              </p>
              <p className="mt-1 text-xs leading-5 text-site-secondary">
                Strong signals found
              </p>
            </div>
            <p
              key={readiness.readyCount}
              data-editor-ready-count
              className={`editor-signal-count font-mono text-2xl font-semibold ${
                isReady ? "text-site-success" : "text-site-action-hover"
              }`}
            >
              {readiness.readyCount}
              <span className="text-sm text-site-muted">/{readiness.totalChecks}</span>
            </p>
          </div>

          <ol
            aria-label={`${readiness.readyCount} of ${readiness.totalChecks} decision-readiness checks are strong`}
            className="mt-4 grid grid-cols-6 gap-1.5"
          >
            {readiness.checks.map((check) => (
              <li
                key={check.id}
                title={check.title}
                className={`h-2 border transition-[background-color,border-color,transform] duration-200 ${
                  check.status === "ready"
                    ? "translate-y-[-1px] border-site-success bg-site-success"
                    : "border-site-border-strong bg-site-canvas"
                }`}
              >
                <span className="sr-only">
                  {check.title}: {check.status === "ready" ? "strong" : "needs attention"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
