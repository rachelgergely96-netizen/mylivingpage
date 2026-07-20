"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent, MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const WORLD_DIRECTIONS: readonly WorldDirection[] = [
  {
    id: "atlas",
    label: "Clear and structured",
    shortLabel: "Clear",
    promise: "Best when you want leadership, scale, and decisions to stand out.",
  },
  {
    id: "nocturne",
    label: "Calm and focused",
    shortLabel: "Calm",
    promise: "Best when your story and craft need room to breathe.",
  },
  {
    id: "quarry",
    label: "Practical and grounded",
    shortLabel: "Practical",
    promise: "Best when you want hands-on work and useful results to lead.",
  },
  {
    id: "velvet",
    label: "Warm and editorial",
    shortLabel: "Warm",
    promise: "Best when personality and people-first leadership matter.",
  },
  {
    id: "atelier",
    label: "Creative and expressive",
    shortLabel: "Creative",
    promise: "Best when ideas, experimentation, and range should feel visible.",
  },
] as const;

const STORY_MOMENTS: readonly StoryMoment[] = [
  {
    id: "application",
    label: "Applying for a role",
    output: "ATS-ready PDF",
    note: "Review matching evidence, choose what to emphasize, then export.",
  },
  {
    id: "referral",
    label: "Getting referred",
    output: "Professional page",
    flavor: "Living Resume",
    note: "Give your referrer one current page with useful context and proof.",
  },
  {
    id: "introduction",
    label: "Making an introduction",
    output: "Share Card + QR",
    note: "Offer a memorable way into your story, with the full page one scan away.",
  },
] as const;

const DEFAULT_WORKFLOW = [
  {
    stepId: "upload",
    index: "01",
    name: "Add your résumé",
    timing: "1 current résumé",
    note: "Upload the PDF or paste the text you already send to employers.",
    format: "source",
  },
  {
    stepId: "review",
    index: "02",
    name: "Check 3 essentials",
    timing: "3 essential checks",
    note: "Confirm your name, headline, and most recent result. Leave the rest for later.",
    format: "page",
  },
  {
    stepId: "publish",
    index: "03",
    name: "Publish one link",
    timing: "1 current link",
    note: "Preview once, publish, and share it. Your page stays private until then.",
    format: "share",
  },
] as const;

const EVERYDAY_ACTIONS = [
  {
    name: "Update your page",
    timing: "Use it when a role, result, or contact detail changes.",
    note: "Change the fact once. Your public link stays the same.",
  },
  {
    name: "Share your link",
    timing: "Use it when you apply, follow up, or meet someone.",
    note: "Send the same current link instead of making another version.",
  },
] as const;

const OPTIONAL_TOOLS = [
  {
    id: "pdf",
    kind: "Applications · Tailored PDF",
    name: "Application PDF",
    timing: "Use it when an application asks for a file.",
    note: "Skip it when the employer accepts your page link.",
  },
  {
    id: "share-card",
    kind: "Networking · Share Card",
    name: "Share Card and QR code",
    timing: "Use it before an event or in-person conversation.",
    note: "Leave it for later when you are only applying online.",
  },
  {
    id: "reference",
    kind: "Reference",
    name: "Examples and guides",
    timing: "Use them only when you feel stuck.",
    note: "You do not need to read anything before you start.",
  },
  {
    id: "statistics",
    kind: "Statistics",
    name: "Page visit statistics",
    timing: "Wait until your link has been shared for 7 days.",
    note: "Wait for a useful pattern; early numbers do not make the page more useful.",
  },
  {
    id: "advanced",
    kind: "Advanced",
    name: "Design and motion controls",
    timing: "Use these after your content is accurate.",
    note: "The starting settings already work, so this can wait.",
  },
] as const;

const SEARCH_BENEFITS = [
  {
    label: "Applications",
    name: "ATS-ready PDF",
    note: "Real selectable text, familiar sections, and a clear reading order.",
  },
  {
    label: "Discovery",
    name: "Recruiter search + AI readability",
    note: "Specific titles, skills, dates, and results stay visible as recognizable text.",
  },
  {
    label: "Sharing",
    name: "Public professional page",
    note: "Your published page is crawlable and has its own title, description, and reusable link.",
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
    >
      <div aria-hidden="true" className={styles.storySourceInner}>
        <div className={styles.storySourceTopline}>
          <span>R</span>
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
          <i />
          <span>EXPERIENCE</span>
          <i />
          <i />
          <i />
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
          <p>Reduced release time by 38% through a shared product and engineering operating model.</p>
        </section>
        <section>
          <span>SKILLS</span>
          <p>Platform strategy · TypeScript · SQL · Cross-functional leadership</p>
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
    >
      <div className={styles.storyBrowserBar}>
        <span>mylivingpage.com/avery</span>
        <b>Sample</b>
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
          <span>Product operations</span>
        </div>
        <div className={styles.storyShareQrPanel}>
          <div>
            <strong>Scan to open the full page</strong>
            <span>mylivingpage.com/avery</span>
          </div>
          <StoryQrPreview />
        </div>
        <div className={styles.storyShareFooter}>
          <span>Link included</span>
          <span>PNG export</span>
        </div>
      </article>
      <div className={styles.storyShareDestinations} aria-hidden="true">
        <span>Email</span>
        <span>Referral</span>
        <span>In person</span>
      </div>
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

export default function LivingHomepagePrototype() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(WORLD_DIRECTIONS[0].id);
  const [storyMomentId, setStoryMomentId] = useState<StoryMomentId>("introduction");
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

  const selectWorld = (
    world: WorldDirection,
    index: number,
    controls: MutableRefObject<Array<HTMLButtonElement | null>>,
    moveFocus = false,
  ) => {
    setActiveThemeId(world.id);
    setStoryMomentId("referral");
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
        <nav className={styles.nav} aria-label="Prototype navigation">
          <Link href="/" className={styles.logo}>
            my<span>living</span>page
          </Link>
          <span className={styles.previewBadge}>Action-first copy prototype</span>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#search-ready">ATS + search</a>
            <Link href="/examples">View examples</Link>
            <Link href="/login">Sign in</Link>
          </div>
          <Link
            href="/signup?ref=homepage_observatory_nav&next=/create"
            className={styles.navCta}
            data-start-action
          >
            Add my résumé
          </Link>
        </nav>
      </header>

      <main id="prototype-content" tabIndex={-1}>
        <section id="prototype-hero" className={styles.hero} data-action-first>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span>Start</span>With the résumé you have</p>
              <h1>Turn your résumé into a page you can share.</h1>
              <p className={styles.heroLead}>
                Upload a PDF or paste the text. Check the important details. Publish one link.
              </p>
              <p className={styles.heroBody}>
                Your résumé opens as a polished private draft. Review it, make any edits,
                and publish when you are ready.
              </p>
              <p className={styles.supportingNote} data-hero-supporting-copy>
                Use the same reviewed experience to apply for a role, get referred,
                or make an introduction.
              </p>
              <div className={styles.heroActions}>
                <Link
                  href="/signup?ref=homepage_observatory_primary&next=/create"
                  className={styles.primaryButton}
                  data-testid="homepage-primary-cta"
                  data-action-priority="primary"
                  data-start-action
                >
                  Add my résumé
                  <ArrowIcon />
                </Link>
                <a href="#live-product-story" className={styles.secondaryButton}>Try the live sample</a>
              </div>
              <div className={styles.trustStrip} aria-label="Product assurances">
                <span>One current résumé</span>
                <span>Private until published</span>
                <span>Completely free</span>
                <span>Edit anything</span>
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
                  <p>Live product story</p>
                  <h2 id="live-product-story-title">What do you need to be understood for?</h2>
                </div>
                <span>Sample data</span>
              </div>

              <div
                className={styles.storyMomentTabs}
                role="group"
                aria-label="Choose a professional moment"
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
                      onClick={() => setStoryMomentId(moment.id)}
                      data-story-moment={moment.id}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {moment.label}
                    </button>
                  );
                })}
              </div>

              <div className={styles.storyStage} data-story-stage>
                <StorySourceResume />
                <div className={styles.storyFlow} aria-hidden="true">
                  <span />
                  <b>Becomes</b>
                  <span />
                </div>
                <div
                  id="prototype-story-output"
                  className={styles.storyOutputFrame}
                  role="region"
                  aria-labelledby={`prototype-story-moment-${storyMomentId}`}
                  data-story-output-region={storyMomentId}
                >
                  <div className={styles.storyMobileSource}>
                    <span>From</span>
                    <strong>Avery-Morgan-Resume.pdf</strong>
                  </div>
                  <div className={styles.storyOutputMeta}>
                    <div>
                      <span>Comes forward</span>
                      <h3>{activeStoryMoment.output}</h3>
                      {activeStoryMoment.flavor ? <small>{activeStoryMoment.flavor}</small> : null}
                    </div>
                    <span>{String(activeStoryIndex + 1).padStart(2, "0")}</span>
                  </div>
                  <div key={storyMomentId} className={styles.storyActiveOutput}>
                    <StoryOutput moment={storyMomentId} world={activeWorld} />
                  </div>
                  <p className={styles.storyOutputNote}>{activeStoryMoment.note}</p>
                </div>
              </div>

              <div className={styles.storyStyleChooser} data-living-gallery data-story-style-chooser>
                <div className={styles.storyStyleHeader} id="story-style-choice-help">
                  <div>
                    <span>Your page design</span>
                    <h3>Choose the look of your Living Resume.</h3>
                  </div>
                  <p>
                    Select a style below. The Living Resume above opens with that design;
                    your information stays the same.
                  </p>
                </div>

                <div
                  className={styles.galleryOptions}
                  role="radiogroup"
                  aria-label="Choose a style for the Living Resume above"
                  aria-describedby="story-style-choice-help"
                >
                  {WORLD_DIRECTIONS.map((world, index) => {
                    const selected = world.id === activeWorld.id;
                    const shownAbove = selected && storyMomentId === "referral";
                    return (
                      <button
                        key={world.id}
                        ref={(node) => { styleControlRefs.current[index] = node; }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-controls="prototype-story-output"
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectWorld(world, index, styleControlRefs)}
                        onKeyDown={(event) => handleWorldKeyDown(event, index, styleControlRefs)}
                        className={`${styles.galleryOption} ${selected ? styles.galleryOptionActive : ""}`}
                        style={getWorldStyle(world.id)}
                        data-gallery-card
                        data-theme-id={world.id}
                        data-action-priority="optional"
                      >
                        <span className={styles.galleryOptionSwatch} aria-hidden="true"><i /></span>
                        <span className={styles.galleryOptionCopy}>
                          <strong>{world.label}</strong>
                          <small>
                            {THEME_MAP[world.id].name}{index === 0 ? " · Recommended" : ""}
                          </small>
                        </span>
                        <span className={styles.galleryOptionState}>
                          {shownAbove ? "Shown above" : selected ? "Selected" : "Choose"}
                        </span>
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
                  <span>{storyMomentId === "referral" ? "Showing above" : "Selected style"}</span>
                  <strong>{activeWorld.label} · {THEME_MAP[activeWorld.id].name}</strong>
                  <p>
                    {storyMomentId === "referral"
                      ? activeWorld.promise
                      : "Choose any style to open the Living Resume above and see it immediately."}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div
          className={styles.identityBand}
          role="region"
          aria-label="The three-step default workflow"
          tabIndex={0}
        >
          <span>Add your résumé</span>
          <i />
          <span>Check 3 essentials</span>
          <i />
          <span>Publish one link</span>
          <i />
          <span>Done for today</span>
        </div>

        <section id="how-it-works" className={styles.sourceSection} data-default-workflow>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>Plan</span>Your 3-step Living Resume setup</p>
            <h2>Add. Check. Publish.</h2>
            <p>
              Do one step at a time. Keep the recommended defaults and leave everything else
              for later.
            </p>
          </div>

          <ol className={styles.outputJourney} aria-label="The simplest way to start">
            {DEFAULT_WORKFLOW.map((step, index) => (
              <li
                key={step.format}
                className={styles.outputStep}
                data-workflow-step={step.stepId}
                data-observatory-format={step.format}
              >
                <div className={styles.outputVisual} aria-hidden="true">
                  <span>{step.index}</span>
                  <div className={styles[`output${step.format[0].toUpperCase()}${step.format.slice(1)}`]}>
                    <b>AVERY</b>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <span className={styles.stepTiming}>{step.timing}</span>
                <strong>{step.name}</strong>
                <p>{step.note}</p>
                {index < DEFAULT_WORKFLOW.length - 1 ? <span className={styles.journeyArrow}>→</span> : null}
              </li>
            ))}
          </ol>

          <aside id="quick-start" className={styles.quickStart} data-overwhelmed-shortcut>
            <div>
              <p className={styles.quickStartLabel}>Quick start · only what you need</p>
              <h3>Add your résumé, check your name and headline, keep the recommended style, then publish.</h3>
              <p data-stopping-point>
                <strong>You can stop here.</strong> A correct, shareable page is enough for today.
              </p>
            </div>
            <div className={styles.quickStartActions}>
              <Link
                href="/signup?ref=homepage_overwhelmed_start&next=/create"
                className={styles.secondaryButton}
                data-action-priority="primary"
                data-start-action
              >
                Add my résumé
              </Link>
              <small data-later-guidance>
                The recommended style is ready to use. PDFs, statistics, QR codes, and design
                controls are available whenever you need them.
              </small>
            </div>
          </aside>
        </section>

        <section
          id="search-ready"
          className={styles.visibilitySection}
          data-search-readiness
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>Search ready</span>For ATS, recruiters, and AI tools</p>
            <h2>Built to be easier to find—and understand.</h2>
            <p>
              Your job titles, skills, dates, and results stay as clear text. That gives ATS tools,
              recruiter search, search engines, and AI-assisted tools recognizable details to work with.
            </p>
          </div>

          <div className={styles.visibilityStory}>
            <figure className={styles.searchPanel} aria-labelledby="search-example-title">
              <figcaption id="search-example-title" className={styles.searchPanelHeader}>
                <span>Example recruiter search</span>
                <small>Truthful matches only</small>
              </figcaption>
              <div className={styles.searchQuery}>
                <span>Search</span>
                <strong>Senior Product Lead · TypeScript · 2M+ requests</strong>
              </div>
              <div className={styles.searchMatches}>
                <article>
                  <span>Role</span>
                  <strong>Senior Product Lead</strong>
                  <small>Clear job title</small>
                </article>
                <article>
                  <span>Skill</span>
                  <strong>TypeScript</strong>
                  <small>Recognizable phrase</small>
                </article>
                <article>
                  <span>Result</span>
                  <strong>2M+ requests daily</strong>
                  <small>Specific evidence</small>
                </article>
              </div>
            </figure>

            <div className={styles.visibilityBenefits}>
              {SEARCH_BENEFITS.map((benefit, index) => (
                <article key={benefit.name}>
                  <span>{String(index + 1).padStart(2, "0")} · {benefit.label}</span>
                  <h3>{benefit.name}</h3>
                  <p>{benefit.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.searchNote}>
            <strong>What this means:</strong>
            <p>
              One truthful story stays clear to people and machines. No tool can guarantee how every
              system will parse or rank your résumé—or guarantee an interview, index placement, or AI
              citation. MyLivingPage never invents experience.
            </p>
          </div>

          <div className={styles.freePromise} data-free-promise>
            <div>
              <span>Free from start to finish</span>
              <h3>One Living Resume. Completely free. Always.</h3>
            </div>
            <p>
              Build, publish, host, update, and download it. Every current style, Share Cards,
              up to three targeted versions, and analytics are included. No card or subscription
              required. No trial. No hidden fees.
            </p>
          </div>
        </section>

        <section id="use-later" className={styles.laterSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>Later</span>Use these only when needed</p>
            <h2>Your page is useful before you use every tool.</h2>
            <p>
              Most days, update one fact or share your link. That is enough. Reference material,
              statistics, and advanced controls stay out of your way until you need them.
            </p>
          </div>

          <div className={styles.everydayBlock} data-everyday-actions>
            <div className={styles.everydayHeading}>
              <span>Everyday</span>
              <h3>Keep one page current.</h3>
              <p>These are the only two actions to remember after you publish.</p>
            </div>
            <div className={styles.everydayGrid}>
              {EVERYDAY_ACTIONS.map((action) => (
                <article key={action.name} className={styles.everydayCard} data-action-priority="normal">
                  <h4>{action.name}</h4>
                  <strong>{action.timing}</strong>
                  <p>{action.note}</p>
                </article>
              ))}
            </div>
          </div>

          <details className={styles.optionalDisclosure} data-optional-tools>
            <summary>
              <span>Optional tools</span>
              <strong>Open these only when you need them</strong>
            </summary>
            <div className={styles.toolGrid}>
              {OPTIONAL_TOOLS.map((tool) => (
                <article
                  key={tool.id}
                  className={styles.toolCard}
                  data-later-tool
                  data-tool-kind={tool.id}
                  data-reference-tools={tool.id === "reference" ? "true" : undefined}
                  data-action-priority="optional"
                >
                  <span>{tool.kind}</span>
                  <h3>{tool.name}</h3>
                  <strong>{tool.timing}</strong>
                  <p>{tool.note}</p>
                </article>
              ))}
            </div>
          </details>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}><span>Done</span>Stop after the basics</p>
          <h2>Publish the useful version. Improve it later.</h2>
          <p>Upload your résumé, check three essentials, and publish one link. That is a complete first session.</p>
          <div className={styles.heroActions}>
            <Link
              href="/signup?ref=homepage_observatory_final&next=/create"
              className={styles.primaryButton}
              data-start-action
            >
              Add my résumé
              <ArrowIcon />
            </Link>
            <a href="#quick-start" className={styles.secondaryButton}>See the quick start</a>
          </div>
          <small>
            One Living Resume is completely free—always. Build, publish, host, update, and download
            it with no card or subscription required, no trial, and no hidden fees.
          </small>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>my<span>living</span>page</Link>
        <span>Action-first copy prototype · Sample profiles only</span>
        <nav aria-label="Prototype footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
        </nav>
      </footer>
    </div>
  );
}
