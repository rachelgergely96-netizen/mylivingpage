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
  galleryNote: string;
  size: "wide" | "tall" | "standard";
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
    label: "Executive systems",
    shortLabel: "Precise",
    promise: "A cartographic world for strategic, systems-minded work.",
    galleryNote: "Leadership, scale, and operating clarity come forward.",
    size: "wide",
  },
  {
    id: "nocturne",
    label: "Cinematic focus",
    shortLabel: "Cinematic",
    promise: "A moonlit stage that gives a career story room to breathe.",
    galleryNote: "A quieter world for narrative, craft, and considered work.",
    size: "tall",
  },
  {
    id: "quarry",
    label: "Grounded craft",
    shortLabel: "Grounded",
    promise: "Material depth for builders who want substance to lead.",
    galleryNote: "Experience feels tangible, durable, and earned.",
    size: "standard",
  },
  {
    id: "velvet",
    label: "Editorial presence",
    shortLabel: "Editorial",
    promise: "Rich editorial pacing for confident, people-first leadership.",
    galleryNote: "Personality appears without competing with the facts.",
    size: "standard",
  },
  {
    id: "atelier",
    label: "Creative signal",
    shortLabel: "Expressive",
    promise: "Painterly motion for multidisciplinary and creative careers.",
    galleryNote: "Ideas, experimentation, and range become visible.",
    size: "wide",
  },
] as const;

const OUTPUTS = [
  {
    index: "01",
    name: "Source résumé",
    note: "Import once. Review every field.",
    format: "source",
  },
  {
    index: "02",
    name: "Living Page",
    note: "A professional world people remember.",
    format: "page",
  },
  {
    index: "03",
    name: "Tailored PDF",
    note: "Clear, selectable text for applications.",
    format: "pdf",
  },
  {
    index: "04",
    name: "Share Card + QR",
    note: "One current story, easy to pass along.",
    format: "share",
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
          <span>Sample profile · live world</span>
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
  const heroControlRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
          <span className={styles.previewBadge}>Homepage prototype 01</span>
          <div className={styles.navLinks}>
            <a href="#living-worlds">Living worlds</a>
            <a href="#one-source">One source</a>
            <Link href="/">Current homepage</Link>
          </div>
          <Link href="/signup?ref=homepage_observatory_nav&next=/create" className={styles.navCta}>
            Build free
          </Link>
        </nav>
      </header>

      <main id="prototype-content" tabIndex={-1}>
        <section id="prototype-hero" className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span>01</span>The homepage is a Living Page</p>
              <h1>Your work shouldn&apos;t sit still.</h1>
              <p className={styles.heroLead}>
                Turn the résumé you already have into a living professional world—and the
                tailored PDF and Share Card you need next.
              </p>
              <p className={styles.heroBody}>
                The facts stay true. The presentation, emphasis, and atmosphere respond to
                the moment.
              </p>
              <div className={styles.heroActions}>
                <Link
                  href="/signup?ref=homepage_observatory_primary&next=/create"
                  className={styles.primaryButton}
                  data-testid="homepage-primary-cta"
                >
                  Build from my résumé — free
                  <ArrowIcon />
                </Link>
                <a href="#living-worlds" className={styles.secondaryButton}>Explore five worlds</a>
              </div>
              <div className={styles.trustStrip} aria-label="Product assurances">
                <span>Private until published</span>
                <span>No credit card</span>
                <span>Review every field</span>
              </div>
            </div>

            <div className={styles.observatory} data-home-observatory>
              <div className={styles.observatoryTopline}>
                <div>
                  <span>Living Page Observatory</span>
                  <strong>Same facts · new world</strong>
                </div>
                <div className={styles.observatoryActions}>
                  <button
                    type="button"
                    aria-label="Pause ambient motion"
                    aria-pressed={motionPaused}
                    data-testid="observatory-motion-toggle"
                    disabled={reducedMotion}
                    onClick={() => setMotionPaused((paused) => !paused)}
                  >
                    {reducedMotion ? "Motion reduced" : motionPaused ? "Motion paused" : "Motion active"}
                  </button>
                  <span className={styles.worldCounter}>0{activeIndex + 1} / 05</span>
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
                <div
                  className={styles.worldRail}
                  role="radiogroup"
                  aria-label="Choose a visual direction"
                >
                  {WORLD_DIRECTIONS.map((world, index) => {
                    const selected = world.id === activeWorld.id;
                    return (
                      <button
                        key={world.id}
                        ref={(node) => { heroControlRefs.current[index] = node; }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectWorld(world, index, heroControlRefs)}
                        onKeyDown={(event) => handleWorldKeyDown(event, index, heroControlRefs)}
                        className={selected ? styles.worldButtonActive : undefined}
                      >
                        <span>0{index + 1}</span>
                        <b>{world.shortLabel}</b>
                      </button>
                    );
                  })}
                </div>
                <p className={styles.worldPromise}>{activeWorld.promise}</p>
                <span className={styles.srOnly} role="status" aria-live="polite" data-testid="observatory-status">
                  {activeTheme.name} selected. {activeWorld.promise}
                </span>
              </div>

              <div className={styles.sourceSignal}>
                <span>Source locked</span>
                <b>Avery-Morgan-Resume.pdf</b>
                <i aria-hidden="true" />
                <span>World changed</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.identityBand} aria-label="One identity across every output">
          <span>One identity</span>
          <i />
          <span>Five worlds</span>
          <i />
          <span>Three useful formats</span>
          <i />
          <span>One current link</span>
        </div>

        <section
          ref={galleryRef}
          id="living-worlds"
          className={styles.gallerySection}
          data-living-gallery
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>02</span>Worlds, not templates</p>
            <h2>One career can feel many different ways.</h2>
            <p>
              Choose a direction. Avery&apos;s experience stays fixed while the visual world changes
              what people feel first.
            </p>
          </div>

          <div
            className={styles.galleryGrid}
            role="radiogroup"
            aria-label="Explore Living Page worlds"
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
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectWorld(world, index, galleryControlRefs)}
                  onKeyDown={(event) => handleWorldKeyDown(event, index, galleryControlRefs)}
                  className={`${styles.galleryCard} ${styles[`gallery${world.size[0].toUpperCase()}${world.size.slice(1)}`]} ${selected ? styles.galleryCardActive : ""}`}
                  style={getWorldStyle(world.id)}
                  data-gallery-card
                  data-theme-id={world.id}
                >
                  <span className={styles.galleryVisual}>
                    {selected && galleryOwnsMotion ? (
                      <GalleryLivePage world={world} animated={galleryAnimated} />
                    ) : (
                      <WorldPoster world={world} />
                    )}
                  </span>
                  <span className={styles.galleryCaption}>
                    <span><b>0{index + 1}</b>{world.label}</span>
                    <strong>{THEME_MAP[world.id].name}</strong>
                    <small>{world.galleryNote}</small>
                  </span>
                  {selected ? <span className={styles.liveBadge}>Live world</span> : null}
                </button>
              );
            })}
          </div>

          <div className={styles.galleryMotionBar}>
            <div>
              <span>Selected living world</span>
              <strong>{activeTheme.name} · {activeWorld.shortLabel}</strong>
            </div>
            <button
              type="button"
              aria-label="Pause ambient motion"
              aria-pressed={motionPaused}
              data-testid="gallery-motion-toggle"
              disabled={reducedMotion}
              onClick={() => setMotionPaused((paused) => !paused)}
            >
              {reducedMotion ? "Motion reduced" : motionPaused ? "Motion paused" : "Motion active"}
            </button>
          </div>
        </section>

        <section id="one-source" className={styles.sourceSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}><span>03</span>One source, shaped for the moment</p>
            <h2>The identity stays. The format moves.</h2>
            <p>
              A Living Page is not a decorative résumé. It is one reviewed professional story
              that can become the right object for the next conversation.
            </p>
          </div>

          <div className={styles.outputJourney}>
            {OUTPUTS.map((output, index) => (
              <div key={output.format} className={styles.outputStep} data-observatory-format={output.format}>
                <div className={styles.outputVisual} aria-hidden="true">
                  <span>{output.index}</span>
                  <div className={styles[`output${output.format[0].toUpperCase()}${output.format.slice(1)}`]}>
                    <b>AVERY</b>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <strong>{output.name}</strong>
                <p>{output.note}</p>
                {index < OUTPUTS.length - 1 ? <span className={styles.journeyArrow}>→</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}><span>04</span>Your experience belongs here</p>
          <h2>One career. A world built around it.</h2>
          <p>Build, publish, host, download, and keep it current for free.</p>
          <div className={styles.heroActions}>
            <Link href="/signup?ref=homepage_observatory_final&next=/create" className={styles.primaryButton}>
              Build from my résumé — free
              <ArrowIcon />
            </Link>
            <Link href="/examples" className={styles.secondaryButton}>View sample pages</Link>
          </div>
          <small>No credit card. No trial. No hidden publishing or download fee.</small>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>my<span>living</span>page</Link>
        <span>Homepage prototype · Sample profiles only</span>
        <nav aria-label="Prototype footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
        </nav>
      </footer>
    </div>
  );
}
