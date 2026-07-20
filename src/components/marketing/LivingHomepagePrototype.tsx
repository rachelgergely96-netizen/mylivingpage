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
    note: "Ignore it when you are only applying online.",
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
    note: "Ignore early numbers; they do not make the page more useful.",
  },
  {
    id: "advanced",
    kind: "Advanced",
    name: "Design and motion controls",
    timing: "Use these after your content is accurate.",
    note: "The starting settings already work, so this can wait.",
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

function WorldPoster({ world }: { world: WorldDirection }) {
  const compositionClass = styles[
    `poster${world.id.slice(0, 1).toUpperCase()}${world.id.slice(1)}`
  ];

  return (
    <div
      className={`${styles.poster} ${compositionClass ?? ""}`}
      style={getWorldStyle(world.id)}
      aria-hidden="true"
    >
      <div className={styles.posterAtmosphere} />
      <span className={styles.posterIndex}>{world.shortLabel}</span>
      <div className={styles.posterIdentity}>
        <span>Sample profile</span>
        <strong>Avery Morgan</strong>
        <p>Senior Product &amp; Platform Lead</p>
      </div>
      <div className={styles.posterProof}>
        <span><b>2M+</b> requests / day</span>
        <span><b>38%</b> faster releases</span>
      </div>
      <div className={styles.posterLines}>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function GalleryLivePage({ world, animated }: { world: WorldDirection; animated: boolean }) {
  return (
    <div
      className={styles.galleryCanvas}
      data-homepage-theme-canvas
      data-canvas-active={animated ? "true" : "false"}
    >
      <ThemeCanvas
        themeId={world.id}
        height="100%"
        className={`${styles.themeCanvasRoot} rounded-none`}
        interactive
        animated={animated}
        mobileAmbientMotion
        motionAware
        maxFps={24}
      >
        <div className={styles.galleryLiveContent} aria-hidden="true">
          <span>Sample profile · Living Resume</span>
          <strong>Avery Morgan</strong>
          <p>Senior Product &amp; Platform Lead</p>
          <div>
            <span><b>2M+</b> requests / day</span>
            <span><b>38%</b> faster releases</span>
          </div>
        </div>
      </ThemeCanvas>
    </div>
  );
}

export default function LivingHomepagePrototype() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(WORLD_DIRECTIONS[0].id);
  const [galleryOwnsMotion, setGalleryOwnsMotion] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const galleryControlRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const galleryRef = useRef<HTMLElement | null>(null);

  const activeIndex = WORLD_DIRECTIONS.findIndex((world) => world.id === activeThemeId);
  const activeWorld = WORLD_DIRECTIONS[activeIndex] ?? WORLD_DIRECTIONS[0];
  const activeTheme = THEME_MAP[activeWorld.id];
  const activeStyle = useMemo(() => getWorldStyle(activeWorld.id), [activeWorld.id]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setGalleryOwnsMotion(entry.isIntersecting && entry.intersectionRatio >= 0.18),
      { threshold: [0, 0.18, 0.45] },
    );
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  const selectWorld = (
    world: WorldDirection,
    index: number,
    controls: MutableRefObject<Array<HTMLButtonElement | null>>,
    moveFocus = false,
  ) => {
    setActiveThemeId(world.id);
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

  const heroAnimated = !reducedMotion && !motionPaused && !galleryOwnsMotion;
  const galleryAnimated = !reducedMotion && !motionPaused && galleryOwnsMotion;

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
                That is the whole first session. We choose a strong look for you, and your
                page stays private until you publish.
              </p>
              <p className={styles.ignoreNote} data-ignore-guidance>
                For now, ignore themes, statistics, PDFs, QR codes, and motion settings.
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
                <a href="#how-it-works" className={styles.secondaryButton}>See the 3 steps</a>
              </div>
              <div className={styles.trustStrip} aria-label="Product assurances">
                <span>One current résumé</span>
                <span>Private until published</span>
                <span>No credit card</span>
                <span>Edit anything</span>
              </div>
            </div>

            <div className={styles.observatory} data-home-observatory>
              <div className={styles.observatoryTopline}>
                <div>
                  <span>Your professional page</span>
                  <strong>Living Resume · featured style</strong>
                </div>
                <div className={styles.observatoryActions}>
                  <button
                    type="button"
                    aria-label={reducedMotion ? "Motion reduced" : motionPaused ? "Resume motion" : "Pause motion"}
                    data-motion-paused={motionPaused ? "true" : "false"}
                    data-testid="observatory-motion-toggle"
                    disabled={reducedMotion}
                    onClick={() => setMotionPaused((paused) => !paused)}
                  >
                    {reducedMotion ? "Motion reduced" : motionPaused ? "Resume motion" : "Pause motion"}
                  </button>
                  <span className={styles.worldCounter}>
                    {activeIndex === 0 ? "Featured" : "Selected look"}
                  </span>
                </div>
              </div>

              <div className={styles.observatoryStage} data-observatory-stage>
                {galleryOwnsMotion ? (
                  <WorldPoster world={activeWorld} />
                ) : (
                  <div
                    className={styles.heroCanvas}
                    data-homepage-theme-canvas
                    data-canvas-active={heroAnimated ? "true" : "false"}
                    data-observatory-live-page
                  >
                    <ThemeCanvas
                      themeId={activeWorld.id}
                      height="100%"
                      className={`${styles.themeCanvasRoot} rounded-none`}
                      interactive
                      animated={heroAnimated}
                      mobileAmbientMotion
                      motionAware
                      maxFps={24}
                    >
                      <div className={styles.resumeViewport}>
                        <ResumeLayout
                          data={SIGNAL_FRAME_SAMPLE}
                          compact
                          headingLevel="h2"
                          disableExternalLinks
                        />
                      </div>
                    </ThemeCanvas>
                  </div>
                )}
                <div className={styles.stageLabel}>
                  <span>Sample data</span>
                  <b>{activeTheme.name}</b>
                </div>
              </div>

              <div className={styles.observatoryControls}>
                <div className={styles.recommendedLook}>
                  <span>Featured example</span>
                  <b>{activeWorld.shortLabel} · {activeTheme.name}</b>
                  <a href="#resume-styles">Explore 5 featured styles</a>
                </div>
                <p className={styles.worldPromise}>{activeWorld.promise}</p>
                <span className={styles.srOnly} role="status" aria-live="polite" data-testid="observatory-status">
                  {activeTheme.name} selected. {activeWorld.promise}
                </span>
              </div>

              <div className={styles.sourceSignal}>
                <span>Uploaded résumé</span>
                <b>Avery-Morgan-Resume.pdf</b>
                <i aria-hidden="true" />
                <span>Preview updated</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.identityBand} aria-label="The three-step default workflow">
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

          <aside id="quick-start" className={styles.minimumPath} data-overwhelmed-shortcut>
            <div>
              <p className={styles.minimumLabel}>Minimum path · required checks only</p>
              <h3>Add your résumé, check your name and headline, keep the recommended style, then publish.</h3>
              <p data-stopping-point>
                <strong>You can stop here.</strong> A correct, shareable page is enough for today.
              </p>
            </div>
            <div className={styles.minimumActions}>
              <Link
                href="/signup?ref=homepage_overwhelmed_start&next=/create"
                className={styles.secondaryButton}
                data-action-priority="primary"
                data-start-action
              >
                Add my résumé
              </Link>
              <small data-ignore-guidance>
                Ignore colors, page styles, statistics, PDFs, QR codes, and advanced settings for now.
              </small>
            </div>
          </aside>
        </section>

        <section
          ref={galleryRef}
          id="resume-styles"
          className={styles.gallerySection}
          data-living-gallery
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>Optional</span>Choose a page style</p>
            <h2>Choose a style—or keep this one.</h2>
            <p>
              Every option uses the same résumé. Only the presentation changes. Atlas is the
              starting style, and you can switch anytime.
            </p>
          </div>

          <div className={styles.galleryChooser}>
            <div className={styles.gallerySelectorMeta} id="style-choice-help">
              <div>
                <span>5 styles · 1 professional page</span>
                <strong>Only the design changes.</strong>
              </div>
              <p>Choose a style to update the preview. Not sure? Atlas is the recommended start.</p>
            </div>

            <div
              className={styles.galleryOptions}
              role="radiogroup"
              aria-label="Choose a style for the same professional page"
              aria-describedby="style-choice-help"
            >
              {WORLD_DIRECTIONS.map((world, index) => {
                const selected = world.id === activeWorld.id;
                return (
                  <button
                    key={world.id}
                    ref={(node) => { galleryControlRefs.current[index] = node; }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-controls="style-preview"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectWorld(world, index, galleryControlRefs)}
                    onKeyDown={(event) => handleWorldKeyDown(event, index, galleryControlRefs)}
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
                      {selected ? "Selected" : "Preview"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={styles.galleryPreview}
              style={getWorldStyle(activeWorld.id)}
              data-style-preview
              data-theme-id={activeWorld.id}
            >
              <div className={styles.galleryPreviewToolbar}>
                <div>
                  <span>Same résumé · Avery Morgan</span>
                  <strong>mylivingpage.com/avery</strong>
                </div>
                <div className={styles.galleryPreviewActions}>
                  <span aria-hidden="true">
                    {String(activeIndex + 1).padStart(2, "0")} / {String(WORLD_DIRECTIONS.length).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    aria-label={reducedMotion ? "Motion reduced" : motionPaused ? "Resume motion" : "Pause motion"}
                    data-motion-paused={motionPaused ? "true" : "false"}
                    data-testid="gallery-motion-toggle"
                    disabled={reducedMotion}
                    onClick={() => setMotionPaused((paused) => !paused)}
                  >
                    {reducedMotion ? "Motion reduced" : motionPaused ? "Resume motion" : "Pause motion"}
                  </button>
                </div>
              </div>

              <div id="style-preview" className={styles.galleryPreviewViewport}>
                {galleryOwnsMotion ? (
                  <GalleryLivePage world={activeWorld} animated={galleryAnimated} />
                ) : (
                  <WorldPoster world={activeWorld} />
                )}
              </div>

              <div className={styles.galleryPreviewCaption} aria-live="polite" aria-atomic="true">
                <div>
                  <span>Selected style</span>
                  <strong>{activeWorld.label} · {activeTheme.name}</strong>
                </div>
                <p>{activeWorld.promise}</p>
                <span className={styles.gallerySameContent}>Same information</span>
              </div>
            </div>
          </div>
        </section>

        <section id="use-later" className={styles.laterSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>Later</span>Use these only when needed</p>
            <h2>Your page is useful before you use every tool.</h2>
            <p>
              Most days, update one fact or share your link—and ignore everything else. Reference
              material, statistics, and advanced controls stay out of your way until you need them.
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
            <a href="#quick-start" className={styles.secondaryButton}>See the minimum path</a>
          </div>
          <small>You do not need to choose a style, read guides, check statistics, or make a PDF first.</small>
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
