"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent, MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import CookieSettingsButton from "@/components/privacy/CookieSettingsButton";
import { LandingStoryShareCard } from "@/components/marketing/LandingStoryShareCard";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
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

const THEME_COUNT = Object.keys(THEME_MAP).length;

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
    note: "One current link for recruiters—update it without changing the URL.",
  },
  {
    id: "application",
    label: "Résumé PDF",
    output: "PDF for applications",
    note: "Pick what matters for the role, check every word, then download a clean résumé PDF.",
  },
  {
    id: "introduction",
    label: "Card + QR code",
    output: "Card + QR code",
    note: "Share a card or QR code that opens your full Living Page.",
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
    <div
      className={styles.truthTransfer}
      aria-hidden="true"
      data-transform-motion
      data-transform-cycle={motionKey}
    >
      <span className={styles.truthLine} />
      <div key={motionKey} className={styles.truthTokens}>
        <b>Name</b>
        <b>Title</b>
        <b>Result</b>
      </div>
      <small>Same facts</small>
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
        {/* The one place the product proves "alive": the web-page output
            animates (24fps is plenty for a small preview; the host pauses it
            off-screen and under reduced motion). The PDF and card tabs unmount
            this canvas entirely, so motion is a feature of the Living Page
            output rather than ambient page chrome. */}
        <ThemeCanvas
          themeId={world.id}
          height="100%"
          className={`${styles.themeCanvasRoot} rounded-none`}
          // The canvas root is positioned by the host so its height is
          // definite: a percentage height cannot resolve against a parent
          // sized by flex, which collapsed the résumé layer inside it.
          style={{ position: "absolute", inset: 0 }}
          interactive={false}
          animated
          mobileAmbientMotion={false}
          motionAware
          maxFps={24}
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
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeWorld = WORLD_DIRECTIONS.find((world) => world.id === activeThemeId)
    ?? WORLD_DIRECTIONS[0];
  const activeStoryIndex = STORY_MOMENTS.findIndex((moment) => moment.id === storyMomentId);
  const activeStoryMoment = STORY_MOMENTS[activeStoryIndex] ?? STORY_MOMENTS[0];
  const activeStyle = useMemo(() => getWorldStyle(activeWorld.id), [activeWorld.id]);

  // The page/card chapters share one selection so the share card visibly
  // follows the chosen page style — the theme-matching detail, demonstrated.
  const [showcaseThemeId, setShowcaseThemeId] = useState<ThemeId>("velvet");
  const showcaseWorld = WORLD_DIRECTIONS.find((world) => world.id === showcaseThemeId)
    ?? WORLD_DIRECTIONS[0];
  const showcaseStyle = useMemo(() => getWorldStyle(showcaseThemeId), [showcaseThemeId]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  // Below-the-fold sections reveal once with a quiet rise. Content is fully
  // visible whenever the observer can't run (reduced motion, no IO support),
  // so nothing can be stranded hidden.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const skipMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window);

    if (skipMotion) {
      sections.forEach((section) => {
        section.dataset.visible = "true";
      });
      return;
    }

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top < window.innerHeight * 0.9) {
        section.dataset.visible = "true";
      }
    });
    root.dataset.motionReady = "true";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );

    sections.forEach((section) => {
      if (section.dataset.visible !== "true") {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  const selectMoment = (momentId: StoryMomentId) => {
    if (momentId === storyMomentId) return;
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
      ref={rootRef}
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
            <Link href="/guides">Guides</Link>
            <Link href="/pricing">Free</Link>
            <Link href="/login">Sign in</Link>
          </div>
          <div className={styles.mobileNavLinks}>
            <Link href="/examples">Examples</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/pricing">Free</Link>
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
              <p className={styles.eyebrow}><span>One résumé</span>One Living Page</p>
              <h1>Your résumé, alive on the web.</h1>
              <p className={styles.heroLead}>
                Turn the résumé you already have into one link you can update anytime.
              </p>
              <p className={styles.heroBody}>
                Import it once, review every field, and publish when you&apos;re ready.
                A clean PDF and share card are included.
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
                  <p>Live demo</p>
                  <h2 id="live-product-story-title">
                    See one résumé become a Living Page.
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
                Pick an output. Your facts stay the same.
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
                    <span>{storyMomentId === "referral" ? `${THEME_COUNT} page styles` : "Page styles"}</span>
                    <h3>
                      {storyMomentId === "referral"
                        ? "Try five looks. Same information."
                        : "Pick a look to return to the Living Page."}
                    </h3>
                  </div>
                  <Link href="/examples">See more examples</Link>
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

        <section id="how-it-works" className={styles.sourceSection} data-default-workflow data-reveal>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>How it works</span>Import, check, publish</p>
            <h2>From résumé to published page.</h2>
            <p>
              Start with the résumé you already use—not a blank form.
            </p>
          </div>

          <div className={styles.identityBand} aria-label="How your résumé becomes a web page">
            <span>Import</span><i />
            <span>Review</span><i />
            <span>Publish</span><i />
            <span>Share</span>
          </div>

          <aside id="quick-start" className={styles.quickStart} data-overwhelmed-shortcut>
            <div>
              <p className={styles.quickStartLabel}>First visit</p>
              <h3>Import. Check. Publish.</h3>
              <p data-stopping-point><strong>You can stop there.</strong> Add more as your work grows.</p>
              <p data-editable-promise>
                Every field stays editable, and your page stays private until you publish it.
              </p>
            </div>
            <Link
              href={`/signup?ref=${signupRefs.quickStart}&next=/create`}
              className={styles.secondaryButton}
              data-start-action
            >
              Create my free page
            </Link>
          </aside>

        <div
          id="living-pages"
          className={styles.pagesSection}
          data-living-pages-chapter
          data-reveal
          aria-labelledby="living-pages-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              <span>The Living Page</span>{THEME_COUNT} styles · five collections
            </p>
            <h3 id="living-pages-title" className={styles.chapterMovement}>
              A page with a world behind it.
            </h3>
            <p>
              Every style is a hand-built animated backdrop. Your details sit on clear,
              legible plates in the same order—whatever look you choose.
            </p>
          </div>

          <div className={styles.pagesGrid}>
            <div className={`${styles.storyLivingOutput} ${styles.pagesStage}`} data-pages-stage style={showcaseStyle}>
              <div className={styles.storyBrowserBar}>
                <span>mylivingpage.com/avery</span>
                <b>Live</b>
              </div>
              <div className={styles.pagesViewport}>
                <ThemeCanvas
                  themeId={showcaseThemeId}
                  height="100%"
                  className={`${styles.themeCanvasRoot} rounded-none`}
                  style={{ position: "absolute", inset: 0 }}
                  interactive={false}
                  animated
                  mobileAmbientMotion={false}
                  motionAware
                  maxFps={24}
                >
                  <div
                    className={styles.storyResumeViewport}
                    role="region"
                    aria-label={`Sample page in the ${THEME_MAP[showcaseThemeId].name} style`}
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
              <div
                className={styles.pagesStyleRow}
                role="group"
                aria-label="Choose a page style for this preview"
              >
                {WORLD_DIRECTIONS.map((world) => {
                  const selected = world.id === showcaseThemeId;
                  return (
                    <button
                      key={world.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setShowcaseThemeId(world.id)}
                      className={selected ? styles.pagesStyleActive : undefined}
                      style={getWorldStyle(world.id)}
                      data-pages-style={world.id}
                    >
                      <span className={styles.pagesStyleSwatch} aria-hidden="true" />
                      {THEME_MAP[world.id].name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.chapterClaim} data-pages-details>
              <p>
                Hand-built worlds that move as you scroll and hold still under reduced
                motion. Your words stay put, in the same clean order, on every style.
              </p>
            </div>
          </div>
          <p className={styles.chapterFootnote}>
            Previewing <strong>{showcaseWorld.label} · {THEME_MAP[showcaseThemeId].name}</strong>.{" "}
            <Link href="/examples">Open full sample pages</Link>
          </p>
        </div>
        </section>

        <section
          id="share-card"
          className={styles.cardSection}
          data-share-card-chapter
          data-reveal
          aria-labelledby="share-card-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              <span>What you send</span>Card · PDF · readable text
            </p>
            <h2 id="share-card-title">What lands with a recruiter.</h2>
            <p>
              A card they can hold, a PDF when a file is asked for, and details that stay
              readable for the people and the software doing the reading.
            </p>
          </div>

          <div className={styles.sectionHeading}>
            <h3 className={styles.chapterMovement}>A card people can hold—and scan.</h3>
            <p>
              Send it in a message, drop it in slides, or print it. The QR code opens
              your full Living Page from any phone camera.
            </p>
          </div>

          <div className={styles.cardGrid}>
            <div className={styles.cardStage} data-card-stage>
              <LandingStoryShareCard
                data={SIGNAL_FRAME_SAMPLE}
                themeId={showcaseThemeId}
                headingLevel="h3"
                qrLabel="Open the full living page"
              />
              <p className={styles.cardStageNote} aria-live="polite">
                Matched to <strong>{THEME_MAP[showcaseThemeId].name}</strong>, the style
                picked above.<span className={styles.pointerOnly}> With a cursor, tilt it.</span>
              </p>
            </div>

            <div className={styles.chapterClaim} data-card-details>
              <p>
                It takes on the style you picked above, so everything you send reads as one
                identity. Page views land on your dashboard, so follow-ups have timing.
              </p>
            </div>
          </div>

        <div id="search-ready" className={styles.visibilitySection} data-search-readiness data-reveal>
          <div className={styles.visibilityIntro}>
            <p className={styles.eyebrow}><span>Easy to read</span>People and hiring tools</p>
            <h3 className={styles.chapterMovement}>
              Your style can change. Your details stay clear.
            </h3>
            <p>
              Job titles, dates, skills, and results stay as readable text for recruiters,
              hiring software (ATS), search, and AI tools.
            </p>
          </div>

          <p className={styles.searchStatementIntro}>What stays easy to read:</p>
          <div
            className={styles.searchStatement}
            aria-label="Résumé details kept easy to read"
            data-readable-detail-types
          >
            <span><small>Job titles</small><strong>The roles you&apos;ve held</strong></span>
            <span><small>Skills</small><strong>What you know how to do</strong></span>
            <span><small>Results</small><strong>What changed because of your work</strong></span>
          </div>


          <p className={styles.searchCarryOver} data-readable-outcomes>
            Export a clean PDF whenever a file is asked for, and update your page without
            changing the link you already shared.
          </p>

          <div className={styles.searchNote}>
            <strong>Your real experience comes first.</strong>
            <p>
              MyLivingPage presents what you provide more clearly. It does not invent experience,
              guarantee how hiring software will read or rank a résumé, or promise interviews,
              search placement, or AI citations.
            </p>
          </div>

        </div>
        </section>

        <section id="closing-cta" className={styles.finalCta} data-reveal>
          <div className={styles.freePromise} data-free-promise>
            <div>
              <span>Always free</span>
              <h3>Everything on this page is free.</h3>
            </div>
            <p>
              Build, publish, host, update, and download. All current page styles, share cards and
              QR codes, up to three role versions, and page-view analytics are included. No credit
              card. No subscription. No trial. No hidden fees.
            </p>
          </div>

          <p className={styles.eyebrow}><span>Ready when you are</span>Start free</p>
          <h2>Publish a Living Page from the résumé you already have.</h2>
          <p>Create a private draft, review every field, and go live when it feels right.</p>
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
          <small>Private until you publish.</small>
        </section>
      </main>

      {isProduction ? (
        <MobileStickyCta
          href={`/signup?ref=landing_mobile_sticky&next=/create`}
          label="Create my free page"
          supportingText="Free · no card"
          targetId="prototype-hero"
          hideNearId="closing-cta"
        />
      ) : null}

      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>my<span>living</span>page</Link>
        <span>
          {isProduction
            ? "Interactive demo uses sample data"
            : "Homepage conversion prototype · Sample profiles only"}
        </span>
        <nav aria-label={isProduction ? "Site and policy links" : "Prototype footer"}>
          <Link href="/examples">Examples</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/pricing">Pricing</Link>
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
