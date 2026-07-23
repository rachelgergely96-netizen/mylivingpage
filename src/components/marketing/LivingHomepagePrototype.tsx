"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent, MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import CookieSettingsButton from "@/components/privacy/CookieSettingsButton";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import styles from "./LivingHomepagePrototype.module.css";

interface WorldDirection {
  id: ThemeId;
  label: string;
  shortLabel: string;
  promise: string;
}

interface LivingHomepagePrototypeProps {
  mode?: "preview" | "production";
}

type StoryMomentId = "application" | "referral" | "introduction";

interface StoryMoment {
  id: StoryMomentId;
  label: string;
  output: string;
  flavor?: string;
  note: string;
}

type WorldStyle = CSSProperties & {
  "--world-accent": string;
  "--world-accent-bright": string;
  "--world-accent-soft": string;
  "--world-accent-border": string;
  "--world-background": string;
  "--world-surface": string;
};

const SIGNUP_REFS = {
  preview: {
    nav: "homepage_observatory_nav",
    primary: "homepage_observatory_primary",
    quickStart: "homepage_overwhelmed_start",
    final: "homepage_observatory_final",
  },
  production: {
    nav: "landing_apply_nav",
    primary: "landing_start_free",
    quickStart: "landing_quick_start",
    final: "landing_final_start",
  },
} as const;

const WORLD_DIRECTIONS: readonly WorldDirection[] = [
  {
    id: "atlas",
    label: "Clear and structured",
    shortLabel: "Clear",
    promise: "Good when you want leadership and large projects to stand out.",
  },
  {
    id: "nocturne",
    label: "Calm and focused",
    shortLabel: "Calm",
    promise: "Good when you want your work and experience to have more room.",
  },
  {
    id: "quarry",
    label: "Practical and grounded",
    shortLabel: "Practical",
    promise: "Good when hands-on work and practical results should come first.",
  },
  {
    id: "velvet",
    label: "Warm and editorial",
    shortLabel: "Warm",
    promise: "Good when personality and team leadership matter.",
  },
  {
    id: "atelier",
    label: "Creative and expressive",
    shortLabel: "Creative",
    promise: "Good when you want ideas and different kinds of work to stand out.",
  },
] as const;

const STORY_MOMENTS: readonly StoryMoment[] = [
  {
    id: "referral",
    label: "Web page",
    output: "Your Living Page",
    flavor: "Professional web page",
    note: "Give recruiters one current page with your experience and key details.",
  },
  {
    id: "application",
    label: "Résumé PDF",
    output: "PDF for applications",
    note: "Choose the details that matter for a job, check every word, then download a standard résumé PDF.",
  },
  {
    id: "introduction",
    label: "Card + QR code",
    output: "Card + QR code",
    note: "Share a small card or QR code that opens your full page.",
  },
] as const;

const DEFAULT_WORKFLOW = [
  {
    stepId: "upload",
    index: "01",
    name: "Bring your résumé",
    timing: "PDF or pasted text",
    note: "Use the résumé you already send to employers. You do not start from an empty form.",
  },
  {
    stepId: "review",
    index: "02",
    name: "Review your details",
    timing: "Name · headline · result",
    note: "Every imported detail stays editable before you publish.",
  },
  {
    stepId: "publish",
    index: "03",
    name: "Publish and share",
    timing: "Private until you publish",
    note: "Update your page later without changing the link you already shared.",
  },
] as const;

const SEARCH_BENEFITS = [
  {
    label: "Application",
    name: "PDF for job applications",
    note: "Selectable text, familiar sections, and a clear order help hiring software read it.",
  },
  {
    label: "Reviewing",
    name: "Easy for recruiters and hiring tools to read",
    note: "Your titles, skills, dates, and results stay as normal text.",
  },
  {
    label: "Sharing",
    name: "One link you can keep using",
    note: "Update the page later without changing the link you already shared.",
  },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function getWorldStyle(themeId: ThemeId): WorldStyle {
  const theme = THEME_MAP[themeId];

  return {
    "--world-accent": theme.presentation.accent,
    "--world-accent-bright": theme.presentation.accentBright,
    "--world-accent-soft": theme.presentation.accentSoft,
    "--world-accent-border": theme.presentation.accentBorder,
    "--world-background": theme.background,
    "--world-surface": theme.presentation.surfaceStrong,
  };
}

function StorySourceResume() {
  return (
    <div
      className={styles.storySource}
      role="img"
      aria-label="Avery Morgan source résumé, imported once"
      data-truth-source
    >
      <div aria-hidden="true" className={styles.storySourceInner}>
        <div className={styles.storySourceTopline}>
          <span>PDF</span>
          <div>
            <strong>Your résumé</strong>
            <small>Imported once</small>
          </div>
        </div>
        <div className={styles.storySourceDocument}>
          <b>AVERY MORGAN</b>
          <strong>Product + Platform Lead</strong>
          <i />
          <i />
          <span>RECENT RESULT</span>
          <p>Led a platform serving 2M+ requests daily.</p>
          <span>SKILLS</span>
          <div>
            <em>TypeScript</em>
            <em>SQL</em>
            <em>Strategy</em>
          </div>
        </div>
        <div className={styles.storySourceStatus}>
          <i />
          One truthful source
        </div>
      </div>
    </div>
  );
}

function TruthTransfer({ motionKey }: { motionKey: number }) {
  return (
    <div className={styles.truthTransfer} aria-hidden="true" data-transform-motion>
      <span className={styles.truthLine} />
      <div key={motionKey} className={styles.truthTokens}>
        <b>Name</b>
        <b>Title</b>
        <b>Result</b>
      </div>
      <small>Same facts, new form</small>
    </div>
  );
}

function StoryPdfOutput() {
  return (
    <div className={styles.storyPdf} data-story-output="application">
      <div className={styles.storyPdfToolbar}>
        <div>
          <span>Role-tailored PDF</span>
          <strong>Avery-Morgan_Product-Lead.pdf</strong>
        </div>
        <b>Ready</b>
      </div>
      <div className={styles.storyPdfPage}>
        <strong className={styles.storyPdfName}>AVERY MORGAN</strong>
        <span className={styles.storyPdfTitle}>Senior Product &amp; Platform Lead</span>
        <small>New York, NY · avery@sample.invalid · sample profile</small>
        <hr />
        <section>
          <span>SUMMARY</span>
          <p>
            Product leader building <mark>large-scale platforms</mark> with cross-functional
            teams, clear systems, and measurable growth.
          </p>
        </section>
        <section>
          <span>EXPERIENCE</span>
          <strong>Senior Product Lead · Northstar Systems</strong>
          <p>
            Led a <mark>TypeScript and SQL</mark> platform serving <mark>2M+ requests daily</mark>.
          </p>
        </section>
      </div>
      <div className={styles.storyOutputBar}>
        <span>Selectable text</span>
        <strong>Included free</strong>
      </div>
    </div>
  );
}

function StoryLivingOutput({ world }: { world: WorldDirection }) {
  return (
    <div
      className={styles.storyLivingOutput}
      data-story-output="referral"
      data-story-living-output
      data-theme-id={world.id}
      data-truth-destination
    >
      <div className={styles.storyBrowserBar}>
        <span>mylivingpage.com/avery</span>
        <b>Live</b>
      </div>
      <div className={styles.storyLivingViewport}>
        <ThemeCanvas
          themeId={world.id}
          height="100%"
          className={`${styles.themeCanvasRoot} rounded-none`}
          interactive={false}
          animated={false}
          mobileAmbientMotion={false}
          motionAware
          maxFps={12}
        >
          <div
            className={styles.storyResumeViewport}
            role="region"
            aria-label="Sample professional page preview"
            tabIndex={0}
          >
            <ResumeLayout
              data={SIGNAL_FRAME_SAMPLE}
              compact
              headingLevel="h2"
              disableExternalLinks
              useExternalScrollRoot
            />
          </div>
        </ThemeCanvas>
      </div>
      <div className={styles.storyOutputBar}>
        <span>One current link</span>
        <strong>{world.shortLabel} · {THEME_MAP[world.id].name}</strong>
      </div>
    </div>
  );
}

function StoryQrPreview() {
  return (
    <svg
      className={styles.storyQr}
      viewBox="0 0 21 21"
      role="img"
      aria-label="Sample QR code preview for the professional page"
      shapeRendering="crispEdges"
    >
      <rect width="21" height="21" fill="#ffffff" />
      <path
        fill="#071321"
        d="M1 1h6v6H1V1Zm1 1v4h4V2H2Zm12-1h6v6h-6V1Zm1 1v4h4V2h-4ZM1 14h6v6H1v-6Zm1 1v4h4v-4H2ZM3 3h2v2H3V3Zm12 0h2v2h-2V3ZM3 16h2v2H3v-2ZM9 1h2v2H9V1Zm3 1h1v3h-2V4h1V2ZM8 5h2v2H8V5Zm3 2h2v2h-2V7Zm3 1h2v2h-2V8Zm3 0h3v2h-1v2h-2V8ZM8 9h2v3H8V9Zm3 1h2v2h-2v-2Zm3 2h2v2h-2v-2Zm3 1h3v2h-3v-2ZM8 13h2v2H8v-2Zm3 1h2v3h-2v-3Zm3 1h2v2h-2v-2Zm3 1h2v4h-2v-4ZM8 17h2v3H8v-3Zm3 1h2v2h-2v-2Zm3 0h2v2h-2v-2Z"
      />
    </svg>
  );
}

function StoryShareOutput() {
  return (
    <div className={styles.storyShareOutput} data-story-output="introduction">
      <article>
        <div className={styles.storyShareHeader}>
          <div>
            <span>Share Card</span>
            <h4>Avery Morgan</h4>
            <p>Senior Product &amp; Platform Lead</p>
          </div>
          <b aria-hidden="true">A</b>
        </div>
        <div className={styles.storyShareTags} aria-label="Featured skills">
          <span>Platform strategy</span>
          <span>TypeScript</span>
        </div>
        <div className={styles.storyShareQrPanel}>
          <div>
            <strong>Scan to open the full page</strong>
            <span>mylivingpage.com/avery</span>
          </div>
          <StoryQrPreview />
        </div>
      </article>
    </div>
  );
}

function StoryOutput({ moment, world }: { moment: StoryMomentId; world: WorldDirection }) {
  if (moment === "application") {
    return <StoryPdfOutput />;
  }

  if (moment === "referral") {
    return <StoryLivingOutput world={world} />;
  }

  return <StoryShareOutput />;
}

export default function LivingHomepagePrototype({
  mode = "preview",
}: LivingHomepagePrototypeProps) {
  const isProduction = mode === "production";
  const signupRefs = SIGNUP_REFS[mode];
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(WORLD_DIRECTIONS[0].id);
  const [storyMomentId, setStoryMomentId] = useState<StoryMomentId>("referral");
  const [motionKey, setMotionKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const styleControlRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeWorld = WORLD_DIRECTIONS.find((world) => world.id === activeThemeId)
    ?? WORLD_DIRECTIONS[0];
  const activeStoryIndex = STORY_MOMENTS.findIndex((moment) => moment.id === storyMomentId);
  const activeStoryMoment = STORY_MOMENTS[activeStoryIndex] ?? STORY_MOMENTS[0];
  const activeStyle = useMemo(() => getWorldStyle(activeWorld.id), [activeWorld.id]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  const selectMoment = (momentId: StoryMomentId) => {
    setStoryMomentId(momentId);
    setMotionKey((current) => current + 1);
  };

  const selectWorld = (
    world: WorldDirection,
    index: number,
    controls: MutableRefObject<Array<HTMLButtonElement | null>>,
    moveFocus = false,
  ) => {
    setActiveThemeId(world.id);
    setStoryMomentId("referral");
    setMotionKey((current) => current + 1);
    if (moveFocus) {
      window.requestAnimationFrame(() => controls.current[index]?.focus());
    }
  };

  const handleWorldKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    controls: MutableRefObject<Array<HTMLButtonElement | null>>,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % WORLD_DIRECTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + WORLD_DIRECTIONS.length) % WORLD_DIRECTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = WORLD_DIRECTIONS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectWorld(WORLD_DIRECTIONS[nextIndex], nextIndex, controls, true);
  };

  return (
    <div
      className={styles.prototype}
      style={activeStyle}
      data-motion-state={reducedMotion ? "reduced" : "full"}
    >
      <a className={styles.skipLink} href="#prototype-content">Skip to main content</a>

      <header className={styles.header}>
        <nav className={styles.nav} aria-label={isProduction ? "Primary navigation" : "Prototype navigation"}>
          <Link href="/" className={styles.logo}>my<span>living</span>page</Link>
          <span className={styles.previewBadge}>
            {isProduction ? "Completely free · No trial" : "Homepage conversion prototype"}
          </span>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#search-ready">For applications</a>
            <Link href="/examples">Examples</Link>
            <Link href="/login">Sign in</Link>
          </div>
          <div className={styles.mobileNavLinks}>
            <Link href="/login">Sign in</Link>
          </div>
          <Link
            href={`/signup?ref=${signupRefs.nav}&next=/create`}
            className={styles.navCta}
            data-start-action
          >
            <span className={styles.navCtaFull}>Create my free page</span>
            <span className={styles.navCtaShort}>Start free</span>
          </Link>
        </nav>
      </header>

      <main id="prototype-content" tabIndex={-1}>
        <section id="prototype-hero" className={styles.hero} data-action-first>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span>Your résumé</span>Alive on the web</p>
              <h1>Your résumé, alive on the web.</h1>
              <p className={styles.heroLead}>
                Turn the résumé you already have into a professional page you can update
                anytime and share as one link.
              </p>
              <p className={styles.heroBody}>
                Upload or paste your résumé, then review every field before publishing.
              </p>
              <div className={styles.heroActions}>
                <Link
                  href={`/signup?ref=${signupRefs.primary}&next=/create`}
                  className={styles.primaryButton}
                  data-testid="homepage-primary-cta"
                  data-action-priority="primary"
                  data-start-action
                >
                  Create my free page
                  <ArrowIcon />
                </Link>
                <a href="#live-product-story" className={styles.secondaryButton}>See an example</a>
              </div>
              <div className={styles.trustStrip} aria-label="Product assurances">
                <span>Completely free</span>
                <span>Private until published</span>
                <span>Edit anytime</span>
              </div>
            </div>

            <section
              id="live-product-story"
              className={styles.storyDemo}
              data-live-product-story
              aria-labelledby="live-product-story-title"
            >
              <div className={styles.storyHeader}>
                <div>
                  <p>From one résumé</p>
                  <h2 id="live-product-story-title">
                    One résumé becomes a web page, a PDF, and a shareable card.
                  </h2>
                </div>
                <span>Sample data</span>
              </div>

              <div
                className={styles.storyMomentTabs}
                role="group"
                aria-label="Choose what the résumé becomes"
              >
                {STORY_MOMENTS.map((moment, index) => {
                  const selected = moment.id === storyMomentId;
                  return (
                    <button
                      key={moment.id}
                      id={`prototype-story-moment-${moment.id}`}
                      type="button"
                      aria-pressed={selected}
                      aria-controls="prototype-story-output"
                      className={selected ? styles.storyMomentActive : undefined}
                      onClick={() => selectMoment(moment.id)}
                      data-story-moment={moment.id}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {moment.label}
                    </button>
                  );
                })}
              </div>

              <p className={styles.storyMobileSummary} data-story-mobile-summary>
                Choose an output above. Your information stays the same.
              </p>

              <div className={styles.storyStage} data-story-stage data-transformation-stage>
                <StorySourceResume />
                <TruthTransfer motionKey={motionKey} />
                <div
                  id="prototype-story-output"
                  className={styles.storyOutputFrame}
                  role="region"
                  aria-labelledby={`prototype-story-moment-${storyMomentId}`}
                  data-story-output-region={storyMomentId}
                >
                  <div className={styles.storyOutputMeta}>
                    <div>
                      <span>Becomes</span>
                      <h3>{activeStoryMoment.output}</h3>
                      {activeStoryMoment.flavor ? <small>{activeStoryMoment.flavor}</small> : null}
                    </div>
                    <span>{String(activeStoryIndex + 1).padStart(2, "0")}</span>
                  </div>
                  <div key={`${storyMomentId}-${motionKey}`} className={styles.storyActiveOutput}>
                    <StoryOutput moment={storyMomentId} world={activeWorld} />
                  </div>
                  <p className={styles.storyOutputNote}>{activeStoryMoment.note}</p>
                </div>
              </div>

              <div className={styles.storyStyleChooser} data-living-gallery data-story-style-chooser>
                <div className={styles.storyStyleHeader} id="story-style-choice-help">
                  <div>
                    <span>{storyMomentId === "referral" ? "59 page styles" : "Page styles"}</span>
                    <h3>
                      {storyMomentId === "referral"
                        ? "Try five styles. Your information stays the same."
                        : "Choose a style to preview your web page again."}
                    </h3>
                  </div>
                  <Link href="/examples">See all page styles</Link>
                </div>
                <div
                  className={styles.galleryOptions}
                  role="radiogroup"
                  aria-label="Choose a page style"
                  aria-describedby="story-style-choice-help"
                >
                  {WORLD_DIRECTIONS.map((world, index) => {
                    const selected = world.id === activeWorld.id;
                    return (
                      <button
                        key={world.id}
                        ref={(node) => { styleControlRefs.current[index] = node; }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-controls="prototype-story-output"
                        aria-label={`${world.label} · ${THEME_MAP[world.id].name}`}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectWorld(world, index, styleControlRefs)}
                        onKeyDown={(event) => handleWorldKeyDown(event, index, styleControlRefs)}
                        className={`${styles.galleryOption} ${selected ? styles.galleryOptionActive : ""}`}
                        style={getWorldStyle(world.id)}
                        data-gallery-card
                        data-theme-id={world.id}
                      >
                        <span className={styles.galleryOptionSwatch} aria-hidden="true"><i /></span>
                        <span>{world.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className={styles.storyStyleStatus}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  data-style-selection-status
                >
                  <strong>{activeWorld.label} · {THEME_MAP[activeWorld.id].name}</strong>
                  <span>{activeWorld.promise}</span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div className={styles.identityBand} aria-label="How your résumé becomes a web page">
          <span>Your résumé</span><i />
          <span>Review details</span><i />
          <span>Publish a page</span><i />
          <span>Share one link</span>
        </div>

        <section id="how-it-works" className={styles.sourceSection} data-default-workflow>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>How it works</span>Start with your résumé</p>
            <h2>Start with the résumé you already have.</h2>
            <p>
              Upload your current résumé, review the details, and publish one professional page.
            </p>
          </div>

          <ol className={styles.outputJourney} aria-label="The simplest way to start">
            {DEFAULT_WORKFLOW.map((step) => (
              <li key={step.stepId} className={styles.outputStep} data-workflow-step={step.stepId}>
                <span className={styles.stepIndex}>{step.index}</span>
                <div>
                  <span className={styles.stepTiming}>{step.timing}</span>
                  <h3>{step.name}</h3>
                  <p>{step.note}</p>
                </div>
              </li>
            ))}
          </ol>

          <aside id="quick-start" className={styles.quickStart} data-overwhelmed-shortcut>
            <div>
              <p className={styles.quickStartLabel}>A simple first visit</p>
              <h3>Add your résumé. Check the basics. Publish.</h3>
              <p data-stopping-point><strong>You can stop there.</strong> Your page can grow when your work does.</p>
            </div>
            <Link
              href={`/signup?ref=${signupRefs.quickStart}&next=/create`}
              className={styles.secondaryButton}
              data-start-action
            >
              Create my free page
            </Link>
          </aside>
        </section>

        <section id="search-ready" className={styles.visibilitySection} data-search-readiness>
          <div className={styles.visibilityIntro}>
            <p className={styles.eyebrow}><span>Easy to read</span>For people and hiring software</p>
            <h2>The design can change. Your details stay easy to read.</h2>
            <p>
              The design can change, but your job titles, dates, skills, and results stay as
              normal text. That makes them easier for recruiters, hiring software (often called
              an ATS), search, and AI tools to read.
            </p>
          </div>

          <p className={styles.searchStatementIntro}>Keep the details employers look for clear:</p>
          <div
            className={styles.searchStatement}
            aria-label="Résumé details kept easy to read"
            data-readable-detail-types
          >
            <span><small>Job titles</small><strong>The roles you have held</strong></span>
            <span><small>Skills</small><strong>What you know how to do</strong></span>
            <span><small>Results</small><strong>What changed because of your work</strong></span>
          </div>

          <div className={styles.visibilityBenefits}>
            {SEARCH_BENEFITS.map((benefit, index) => (
              <article key={benefit.name}>
                <span>{String(index + 1).padStart(2, "0")} · {benefit.label}</span>
                <h3>{benefit.name}</h3>
                <p>{benefit.note}</p>
              </article>
            ))}
          </div>

          <div className={styles.searchNote}>
            <strong>Your real experience comes first.</strong>
            <p>
              MyLivingPage helps make your information easier to read. It does not invent
              experience or guarantee how hiring software will read or rank your résumé, or
              promise interviews, search placement, or AI citations.
            </p>
          </div>

          <div className={styles.freePromise} data-free-promise>
            <div>
              <span>Free from start to finish</span>
              <h3>Everything shown here is free.</h3>
            </div>
            <p>
              Build, publish, host, update, and download your page. All current page styles,
              shareable cards and QR codes, up to three versions for different jobs, and page-view
              analytics are included. No credit card or subscription. No trial. No hidden fees.
            </p>
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}><span>Ready when you are</span>Start with your résumé</p>
          <h2>Make your experience easier to see and share.</h2>
          <p>Create a private draft from your résumé. Review everything. Publish when it feels right.</p>
          <div className={styles.heroActions}>
            <Link
              href={`/signup?ref=${signupRefs.final}&next=/create`}
              className={styles.primaryButton}
              data-start-action
            >
              Create my free page
              <ArrowIcon />
            </Link>
            <Link href="/examples" className={styles.secondaryButton}>Explore examples</Link>
          </div>
          <small>No credit card. No subscription. Private until you publish.</small>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>my<span>living</span>page</Link>
        <span>
          {isProduction
            ? "Interactive demo uses sample data"
            : "Homepage conversion prototype · Sample profiles only"}
        </span>
        <nav aria-label={isProduction ? "Legal and policy links" : "Prototype footer"}>
          {isProduction ? <Link href="/legal">Legal</Link> : null}
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          {isProduction ? <Link href="/cookies">Cookies</Link> : null}
          <Link href="/security">Security</Link>
          {isProduction ? <Link href="/delete-account">Delete account</Link> : null}
          {isProduction ? <CookieSettingsButton /> : null}
        </nav>
      </footer>
    </div>
  );
}
