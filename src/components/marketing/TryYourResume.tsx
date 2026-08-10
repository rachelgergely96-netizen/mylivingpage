"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ThemePicker from "@/components/ThemePicker";
import { saveAnonymousCreateDraft } from "@/lib/anonymous-draft";
import { MAX_RESUME_TEXT_CHARACTERS, parseResumeText } from "@/lib/resume-import";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

/**
 * Paste your résumé, see your own page, then decide whether to sign up.
 *
 * Runs entirely in the browser. `parseResumeText` is pure string and regex work
 * with no Node built-ins, and the preview is the same ThemeCanvas + ResumeLayout
 * the live page uses — so this needs no endpoint, no rate limit, and no CAPTCHA,
 * and adds no abuse surface.
 *
 * File upload deliberately stays behind signup: PDF and DOCX extraction is
 * synchronous server-side zlib and regex work, which is a very different
 * exposure to hand to anonymous callers.
 */
export default function TryYourResume() {
  const [resumeText, setResumeText] = useState("");
  const [parsed, setParsed] = useState<ResumeData | null>(null);
  const [detectedCount, setDetectedCount] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [saved, setSaved] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const canPreview = resumeText.trim().length > 40;

  const showPreview = useCallback(() => {
    if (!canPreview) {
      return;
    }

    const result = parseResumeText(resumeText);
    setParsed(result.data);
    setDetectedCount(result.detectedFields.length);
    setSaved(false);

    window.requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }, [canPreview, resumeText]);

  const keepIt = useCallback(() => {
    if (!parsed) {
      return;
    }

    // Mirrors the CreateDraft shape so /create can restore it as-is.
    saveAnonymousCreateDraft({
      resumeText,
      guidedData: parsed,
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
    setSaved(true);
  }, [parsed, resumeText, themeId]);

  const signupHref = useMemo(
    () => `/signup?next=${encodeURIComponent("/create")}`,
    [],
  );

  return (
    <div className="space-y-5">
      <section className="site-panel p-5 sm:p-6">
        <label
          htmlFor="try-resume-text"
          className="grid gap-2 text-sm font-semibold text-site-secondary"
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
            onChange={(event) => setResumeText(event.target.value)}
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
          service reads it — the page below is built on this device.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={showPreview}
            disabled={!canPreview}
            className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            See my page
          </button>
          {!canPreview && resumeText.trim() ? (
            <p className="text-xs text-site-muted">
              Add a little more text and we can build something worth looking at.
            </p>
          ) : null}
        </div>
      </section>

      {parsed ? (
        <div ref={previewRef} className="scroll-mt-24 space-y-4">
          <section className="site-panel p-5 sm:p-6">
            <p className="site-eyebrow">Your page</p>
            <h2 className="site-section-title mt-2">
              This is your résumé, alive on the web
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
              Read from {detectedCount} {detectedCount === 1 ? "area" : "areas"} of what you
              pasted. Anything it misread is editable once you sign up — nothing here is
              published.
            </p>
          </section>

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

          <div className="overflow-hidden border border-site-border-strong bg-site-canvas-alt">
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
                <ResumeLayout data={parsed} headingLevel="h2" disableExternalLinks />
              </div>
            </ThemeCanvas>
          </div>

          <section className="site-callout p-5 sm:p-6">
            <p className="site-eyebrow">Keep it</p>
            <h3 className="site-panel-title mt-2">
              Create a free account and this becomes your page
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
              Publishing is free and does not need a card. You will land back in the editor
              with everything you just pasted already filled in.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={signupHref}
                onClick={keepIt}
                className="site-button site-button-primary"
              >
                Create my free page
              </Link>
              <Link href="/login?next=/create" onClick={keepIt} className="site-nav-link">
                I already have an account
              </Link>
            </div>
            {saved ? (
              <p role="status" className="mt-3 text-xs text-site-success">
                Saved to this browser. It will be waiting for you after you sign in.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
