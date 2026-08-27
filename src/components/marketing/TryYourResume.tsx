"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type MouseEvent } from "react";
import ProvenancePlate from "@/components/ui/ProvenancePlate";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ThemePicker from "@/components/ThemePicker";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { saveAnonymousCreateDraft } from "@/lib/anonymous-draft";
import {
  MOTION_EVENTS,
  MOTION_MODE_POLICIES,
  MOTION_SIGNALS,
} from "@/lib/motion";
import {
  MAX_RESUME_TEXT_CHARACTERS,
  parseResumeText,
  type ParsedResumeImport,
  type ResumeImportField,
} from "@/lib/resume-import";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import styles from "./TryYourResume.module.css";

type ReviewState = "empty" | "dirty" | "review-required" | "reviewed";
type PreviewTarget =
  | "identity"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certifications";

const FIELD_LABELS: Record<ResumeImportField, string> = {
  name: "Name",
  headline: "Headline",
  location: "Location",
  contact: "Contact links",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};

const FIELD_PREVIEW_TARGETS: Record<ResumeImportField, PreviewTarget> = {
  name: "identity",
  headline: "identity",
  location: "identity",
  contact: "identity",
  summary: "summary",
  experience: "experience",
  education: "education",
  skills: "skills",
  projects: "projects",
  certifications: "certifications",
};

const PREVIEW_SELECTORS: Record<PreviewTarget, string> = {
  identity: "[data-resume-header]",
  summary: '[data-motion-section="summary"]',
  experience: '[data-motion-section="experience"]',
  projects: '[data-motion-section="projects"]',
  education: '[data-motion-section="education"]',
  skills: '[data-motion-section="skills"]',
  certifications: '[data-motion-section="certifications"]',
};

const SAMPLE_STARTERS = [
  {
    id: "product",
    label: "Product leader",
    text: `Avery Chen
Senior Product Manager
Seattle, WA | avery.chen@example.invalid

SUMMARY
Product leader who turns complex customer problems into clear product systems.

EXPERIENCE
Senior Product Manager | Northstar Systems | 2021 - Present
- Led a cross-functional launch that improved onboarding completion by 24%.
- Built a customer research program used across product and design.

SKILLS
Product strategy, Roadmapping, Customer research, Experiment design`,
  },
  {
    id: "operations",
    label: "Operations lead",
    text: `Jordan Brooks
Operations Program Lead
Chicago, IL | jordan.brooks@example.invalid

SUMMARY
Operations leader who builds reliable programs for fast-growing teams.

EXPERIENCE
Operations Program Lead | Meridian Group | 2020 - Present
- Redesigned intake across four teams and reduced turnaround time by 31%.
- Created a weekly operating review with clear owners and decisions.

SKILLS
Program management, Process design, Change management, Analytics`,
  },
] as const;

function truncateLocalLine(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed;
}

/**
 * A local-only proof surface: parser input and lineage stay in component memory
 * while previewing. A persistent device draft is written only from a deliberate
 * sign-in or sign-up action after review.
 */
export default function TryYourResume() {
  const { mode: motionMode } = useMotionPreference();
  const allowsSmoothScroll = MOTION_MODE_POLICIES[motionMode].allowsSmoothScroll;
  const [resumeText, setResumeText] = useState("");
  const [previewedText, setPreviewedText] = useState("");
  const [parsedImport, setParsedImport] = useState<ParsedResumeImport | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("empty");
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<ResumeImportField | null>(null);
  const [parseSequence, setParseSequence] = useState(0);
  const [correspondenceSequence, setCorrespondenceSequence] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const canPreview = resumeText.trim().length > 40;
  const keepReady = Boolean(parsedImport && reviewState === "reviewed");
  const activePreviewTarget = activeField
    ? FIELD_PREVIEW_TARGETS[activeField]
    : undefined;

  const detectedFacts = parsedImport
    ? parsedImport.detectedFields.flatMap((field) => {
        const source = parsedImport.fieldSources[field];
        return source ? [{ field, source }] : [];
      })
    : [];

  const buildPreview = useCallback(
    (text: string) => {
      if (text.trim().length <= 40) return;

      const result = parseResumeText(text);
      setParsedImport(result);
      setPreviewedText(text);
      setReviewState("review-required");
      setActiveField(result.detectedFields[0] ?? null);
      setParseSequence((sequence) => sequence + 1);
      setCorrespondenceSequence((sequence) => sequence + 1);
      setSaved(false);
      setSaveError(null);

      window.requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({
          behavior: allowsSmoothScroll ? "smooth" : "auto",
          block: "start",
        });
      });
    },
    [allowsSmoothScroll],
  );

  const chooseStarter = (id: string, text: string) => {
    setResumeText(text);
    setSelectedSampleId(id);
    buildPreview(text);
  };

  const showFieldInPreview = (field: ResumeImportField) => {
    const previewTarget = FIELD_PREVIEW_TARGETS[field];
    setActiveField(field);
    setCorrespondenceSequence((sequence) => sequence + 1);

    window.requestAnimationFrame(() => {
      const preview = previewRef.current;
      const scrollRoot = preview?.querySelector<HTMLElement>(
        '[data-analytics-scroll-root="true"]',
      );
      const target = preview?.querySelector<HTMLElement>(PREVIEW_SELECTORS[previewTarget]);
      if (!scrollRoot || !target) return;

      const rootRect = scrollRoot.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      scrollRoot.scrollTo({
        top: Math.max(0, scrollRoot.scrollTop + targetRect.top - rootRect.top - 24),
        behavior: allowsSmoothScroll ? "smooth" : "auto",
      });
    });
  };

  const keepIt = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (!parsedImport || reviewState !== "reviewed") {
      event.preventDefault();
      return;
    }

    setSaved(false);
    setSaveError(null);
    const persisted = saveAnonymousCreateDraft({
      resumeText: previewedText,
      guidedData: parsedImport.data,
      parsedData: null,
      selectedTheme: themeId,
      step: "input",
      variants: [],
      selectedPreviewVariantId: null,
      jobSeekerProfile: {
        role_track: "general",
        primary_goal: "share_profile",
        target_audience: "general_public",
      },
    });

    if (!persisted) {
      event.preventDefault();
      setSaveError(
        "We couldn't save a temporary browser draft, so you haven't left this page. Keep this tab open, allow site storage or free browser space, then try the sign-up or sign-in link again.",
      );
      return;
    }

    setSaved(true);
  }, [parsedImport, previewedText, reviewState, themeId]);
  const keepItOnAuxClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button === 1) keepIt(event);
    },
    [keepIt],
  );

  const signupHref = "/signup?ref=try_keep&next=/create";

  return (
    <div className="space-y-5">
      <section className="site-panel p-5 sm:p-6">
        <div>
          <p className="site-eyebrow">Safe sample starters</p>
          <h2 className="site-panel-title mt-2">Start with a sample or paste your own text</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
            The samples are fictional. Replace them whenever you are ready; parsing still happens
            only in this browser tab.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Sample résumé starters">
            {SAMPLE_STARTERS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                aria-pressed={selectedSampleId === sample.id}
                onClick={() => chooseStarter(sample.id, sample.text)}
                className="site-button site-button-secondary"
              >
                Preview {sample.label.toLowerCase()} sample
              </button>
            ))}
          </div>
        </div>

        <label
          htmlFor="try-resume-text"
          className="mt-6 grid gap-2 text-sm font-semibold text-site-secondary"
        >
          <span className="flex flex-wrap items-baseline justify-between gap-3">
            Paste your résumé
            <span className="font-mono text-xs font-normal text-site-muted">
              {resumeText.length.toLocaleString()}/
              {MAX_RESUME_TEXT_CHARACTERS.toLocaleString()}
            </span>
          </span>
          <textarea
            id="try-resume-text"
            value={resumeText}
            maxLength={MAX_RESUME_TEXT_CHARACTERS}
            onChange={(event) => {
              setResumeText(event.target.value);
              setSelectedSampleId(null);
              setSaved(false);
              setSaveError(null);
              if (parsedImport) setReviewState("dirty");
            }}
            rows={10}
            placeholder="Paste the text of your résumé here. Name, headline, experience, skills — whatever you have."
            aria-describedby="try-resume-privacy"
            className="site-field w-full resize-y px-4 py-3 text-base font-normal leading-6 sm:text-sm"
          />
        </label>

        <p
          id="try-resume-privacy"
          className="mt-3 border-l-2 border-site-action px-3 text-xs leading-5 text-site-secondary"
        >
          This stays in your browser. Nothing is uploaded, no account is created, and no AI
          service reads it. Previewing does not write a persistent device/browser draft. Source
          lines are shown only here and never placed in the URL or analytics.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => buildPreview(resumeText)}
            disabled={!canPreview}
            className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reviewState === "dirty" ? "Refresh my page" : "See my page"}
          </button>
          {!canPreview && resumeText.trim() ? (
            <p className="text-xs text-site-muted">
              Add a little more text and we can build something worth looking at.
            </p>
          ) : null}
        </div>
      </section>

      {parsedImport ? (
        <div ref={previewRef} className="scroll-mt-24 space-y-4">
          <section
            className="site-panel p-5 sm:p-6"
            data-motion-event={MOTION_EVENTS.RESUME_IMPORT_REVIEW_REQUIRED}
            data-motion-signal={MOTION_SIGNALS.REVIEW_GATE}
            data-motion-sequence={parseSequence}
            data-motion-state={reviewState}
            data-motion-target="local-preview"
          >
            <p className="site-eyebrow">Review status</p>
            <h2 className="site-section-title mt-2">This is your résumé, alive on the web</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
              Read from {parsedImport.detectedFields.length}{" "}
              {parsedImport.detectedFields.length === 1 ? "area" : "areas"} of the text. Nothing
              here is published, and every detected fact remains editable after sign-up.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p role="status" aria-live="polite" className="site-badge">
                {reviewState === "dirty"
                  ? "Text changed · preview needs a refresh"
                  : reviewState === "reviewed"
                    ? "Reviewed · ready to keep"
                    : "Review required · check the detected facts"}
              </p>
              {reviewState === "review-required" ? (
                <button
                  type="button"
                  onClick={() => setReviewState("reviewed")}
                  className="site-button site-button-secondary"
                >
                  Mark these facts reviewed
                </button>
              ) : null}
            </div>
          </section>

          <div
            data-motion-event={MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED}
            data-motion-signal={MOTION_SIGNALS.TRUTH_TRANSFER}
            data-motion-sequence={correspondenceSequence}
            data-motion-state="fact-confirmed"
            data-motion-target={activeField ?? undefined}
          >
            <ProvenancePlate
              title="Detected facts and their source lines"
              eyebrow="Local fact lineage"
              headingLevel="h3"
              description={
                <p>
                  Select a fact to see exactly where it lands in the page preview. This evidence
                  exists only in this tab.
                </p>
              }
            >
              {detectedFacts.length ? (
                <ul className="grid gap-px bg-site-border sm:grid-cols-2">
                  {detectedFacts.map(({ field, source }) => (
                    <li key={field} className="bg-site-surface">
                      <button
                        type="button"
                        aria-pressed={activeField === field}
                        onClick={() => showFieldInPreview(field)}
                        className="min-h-24 w-full border-l-2 border-transparent px-4 py-3 text-left text-sm text-site-secondary transition-colors hover:border-site-action hover:bg-site-selected focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-site-focus aria-pressed:border-site-action aria-pressed:bg-site-selected"
                      >
                        <span className="block font-semibold text-site-text">
                          {FIELD_LABELS[field]}
                        </span>
                        <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-[0.1em] text-site-muted">
                          Read from
                        </span>
                        <q className="mt-1 block break-words text-xs leading-5">
                          {truncateLocalLine(source.sourceLine)}
                        </q>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-site-muted">
                  No source lines were detected. Add clearer section headings and refresh the
                  preview.
                </p>
              )}
              {parsedImport.warnings.length ? (
                <p className="mt-3 text-xs leading-5 text-site-muted">
                  Parser note: {parsedImport.warnings.join(" ")}
                </p>
              ) : null}
            </ProvenancePlate>
          </div>

          <section aria-labelledby="try-theme-title" className="space-y-3">
            <h3 id="try-theme-title" className="site-panel-title px-1">
              Try a different style
            </h3>
            <ThemePicker
              themes={THEME_REGISTRY}
              selectedThemeId={themeId}
              onSelectTheme={setThemeId}
            />
          </section>

          <div
            className={`${styles.previewFrame} overflow-hidden border border-site-border-strong bg-site-canvas-alt`}
            data-correspondence-target={activePreviewTarget}
            data-motion-event={MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED}
            data-motion-signal={MOTION_SIGNALS.TRUTH_TRANSFER}
            data-motion-sequence={correspondenceSequence}
            data-motion-state="preview-correspondence"
            data-motion-target={activeField ?? undefined}
          >
            <div className="flex items-center gap-2 border-b border-site-border bg-site-canvas px-4 py-3">
              <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
              <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
              <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
              <div className="ml-3 min-w-0 truncate border border-site-border bg-site-surface px-3 py-1 text-xs text-site-secondary">
                mylivingpage.com/<span className="text-site-action">your-name</span>
              </div>
            </div>
            <ThemeCanvas
              themeId={themeId}
              height="min(560px, calc(100dvh - 240px))"
              className="rounded-none"
              motionAware
            >
              <div className="h-full">
                <ResumeLayout
                  data={parsedImport.data}
                  headingLevel="h2"
                  disableExternalLinks
                  privacySafeDataAttributes
                />
              </div>
            </ThemeCanvas>
          </div>

          <section className="site-callout p-5 sm:p-6">
            <p className="site-eyebrow">Keep it</p>
            <h3 className="site-panel-title mt-2">
              Create a free account and this becomes your page
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
              Publishing is free and does not need a card. If you deliberately continue below,
              this browser writes a temporary device/browser draft for the unauthenticated
              handoff. It contains the résumé text you pasted and the reviewed preview so the
              editor can restore both after sign-in. Previewing alone never writes that draft.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {keepReady ? (
                <>
                  <Link
                    href={signupHref}
                    onAuxClick={keepItOnAuxClick}
                    onClick={keepIt}
                    className="site-button site-button-primary"
                  >
                    Create my free page
                  </Link>
                  <Link
                    href="/login?next=/create"
                    onAuxClick={keepItOnAuxClick}
                    onClick={keepIt}
                    className="site-nav-link"
                  >
                    I already have an account
                  </Link>
                </>
              ) : (
                <button type="button" disabled className="site-button site-button-primary opacity-50">
                  {reviewState === "dirty" ? "Refresh preview to continue" : "Review facts to continue"}
                </button>
              )}
            </div>
            {saved ? (
              <p role="status" className="mt-3 text-xs text-site-success">
                Temporary device/browser draft saved. It contains the pasted résumé text, expires
                after a couple of hours, and can be restored after you sign in.
              </p>
            ) : null}
            {saveError ? (
              <p
                role="alert"
                className="site-alert-danger mt-3 px-3 py-2 text-xs leading-5"
                data-try-draft-save-error
              >
                {saveError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
