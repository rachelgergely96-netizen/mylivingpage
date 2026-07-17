"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import { ATS_READINESS_DISCLOSURE } from "@/lib/marketing-samples";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/site";
import type { ThemeId } from "@/themes/types";
import styles from "./SignalFrameHomepage.module.css";

type MomentId = "application" | "referral" | "introduction";

const MOMENTS: ReadonlyArray<{
  id: MomentId;
  label: string;
  shortLabel: string;
  output: string;
  note: string;
}> = [
  {
    id: "application",
    label: "Applying for a role",
    shortLabel: "Application",
    output: "ATS-ready PDF",
    note: "Review matching evidence, choose what to emphasize, then export.",
  },
  {
    id: "referral",
    label: "Getting referred",
    shortLabel: "Referral",
    output: "Living Page",
    note: "A concise story gives the referrer useful context.",
  },
  {
    id: "introduction",
    label: "Making an introduction",
    shortLabel: "Introduction",
    output: "Share Card + QR",
    note: "A memorable entry point makes the full story easy to pass along.",
  },
];

const THEME_DIRECTIONS: ReadonlyArray<{
  id: ThemeId;
  label: string;
  themeName: string;
  description: string;
  className: string;
}> = [
  {
    id: "matrix",
    label: "Focused + technical",
    themeName: "Matrix",
    description: "High signal, structured, precise",
    className: styles.themeTechnical,
  },
  {
    id: "aurora",
    label: "Warm + approachable",
    themeName: "Aurora",
    description: "Open, human, collaborative",
    className: styles.themeWarm,
  },
  {
    id: "ember",
    label: "Bold + creative",
    themeName: "Ember",
    description: "Confident, expressive, memorable",
    className: styles.themeBold,
  },
];

const RESUME_SAMPLE = SIGNAL_FRAME_SAMPLE;

const SignalFrameRichOutput = dynamic(
  () => import("@/components/marketing/SignalFrameRichOutput"),
  {
    ssr: false,
    loading: () => <div className={styles.outputLoading}>Loading sample output…</div>,
  },
);

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4 10 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15 15 5 5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function DocumentPreview() {
  return (
    <div className={styles.pdfPreview}>
      <div className={styles.pdfToolbar}>
        <div>
          <span className={styles.tinyLabel}>Role-tailored PDF</span>
          <strong>Avery-Morgan_Product-Lead.pdf</strong>
        </div>
        <span className={styles.readyStatus}>Ready</span>
      </div>
      <div className={styles.pdfPage}>
        <div className={styles.pdfName}>AVERY MORGAN</div>
        <div className={styles.pdfTitle}>Senior Product &amp; Platform Lead</div>
        <div className={styles.pdfContact}>
          {RESUME_SAMPLE.location} · {RESUME_SAMPLE.email} · sample profile
        </div>
        <div className={styles.pdfRule} />
        <div className={styles.pdfSection}>
          <span>SUMMARY</span>
          <p>
            Product leader building <mark>large-scale platforms</mark> with cross-functional teams,
            clear systems, and measurable growth.
          </p>
        </div>
        <div className={styles.pdfSection}>
          <span>EXPERIENCE</span>
          <strong>Senior Product Lead · Northstar Systems</strong>
          <p>
            Led a <mark>TypeScript and SQL</mark> platform serving <mark>2M+ requests daily</mark>.
          </p>
          <p>Reduced release time by 38% through a shared product and engineering operating model.</p>
        </div>
        <div className={styles.pdfSection}>
          <span>SKILLS</span>
          <p>Platform strategy · TypeScript · SQL · Team leadership · Product operations</p>
        </div>
      </div>
      <Link href={getSignupHref("landing_story_primary")} className={styles.downloadButton}>
        Build + download yours
        <span aria-hidden="true">↓</span>
      </Link>
    </div>
  );
}

function ActiveOutput({
  moment,
  themeId,
}: {
  moment: MomentId;
  themeId: ThemeId;
}) {
  return (
    <div
      id="professional-output-panel"
      className={styles.activeOutput}
    >
      {moment === "application" ? <DocumentPreview /> : null}
      {moment === "referral" ? <SignalFrameRichOutput mode="page" themeId={themeId} /> : null}
      {moment === "introduction" ? <SignalFrameRichOutput mode="card" themeId={themeId} /> : null}
    </div>
  );
}

function SourceResume() {
  return (
    <div className={styles.sourceResume}>
      <div className={styles.sourceTopline}>
        <span className={styles.fileIcon}>R</span>
        <div>
          <strong>Your résumé</strong>
          <span>Imported once</span>
        </div>
      </div>
      <div className={styles.sourceDocument}>
        <div className={styles.sourceName}>AVERY MORGAN</div>
        <div className={styles.sourceRole}>Product + Platform Lead</div>
        <div className={styles.sourceLineWide} />
        <div className={styles.sourceLine} />
        <div className={styles.sourceLineShort} />
        <span className={styles.sourceHeading}>EXPERIENCE</span>
        <div className={styles.sourceLineWide} />
        <div className={styles.sourceLine} />
        <div className={styles.sourceLineShort} />
        <span className={styles.sourceHeading}>SKILLS</span>
        <div className={styles.sourceTags}>
          <span>TypeScript</span>
          <span>SQL</span>
          <span>Strategy</span>
        </div>
      </div>
      <div className={styles.sourceFoot}>
        <span className={styles.statusSquare} />
        Source stays aligned
      </div>
    </div>
  );
}

export default function SignalFrameHomepage() {
  const [moment, setMoment] = useState<MomentId>("application");
  const [themeId, setThemeId] = useState<ThemeId>("matrix");
  const [importMode, setImportMode] = useState<"upload" | "paste">("upload");
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeMoment = MOMENTS.find((item) => item.id === moment) ?? MOMENTS[0];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
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
          if (!entry.isIntersecting) {
            return;
          }
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 },
    );

    sections.forEach((section) => {
      if (section.dataset.visible !== "true") {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div ref={rootRef} className={styles.homepage} data-site-ui>
      <a href="#homepage-content" className={styles.skipLink}>Skip to main content</a>
      <CosmicBackground activeWhileId="hero-section" />
      <div className={styles.cosmicVeil} aria-hidden="true" />

      <div className={styles.pageLayer}>
        <header className={styles.header}>
          <nav className={styles.nav} aria-label="Primary navigation">
            <Link href="/" className={styles.logo}>
              my<span>living</span>page
            </Link>
            <div className={styles.navLinks}>
              <a href="#how">How it works</a>
              <a href="#ats">ATS + PDF</a>
              <Link href="/examples">Examples</Link>
              <a href="#pricing">Free</a>
            </div>
            <div className={styles.navActions}>
              <Link href="/login?next=/dashboard" className={styles.loginLink}>
                Log in
              </Link>
              <Link href={getSignupHref("landing_apply_nav")} className={styles.navCta}>
                <span className={styles.desktopCta}>Build from my résumé — free</span>
                <span className={styles.mobileCta}>Build free</span>
              </Link>
              <button
                ref={menuButtonRef}
                type="button"
                className={styles.menuButton}
                aria-expanded={menuOpen}
                aria-controls="homepage-mobile-menu"
                aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
            {menuOpen ? (
              <div id="homepage-mobile-menu" className={styles.mobileMenu}>
                <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
                <a href="#ats" onClick={() => setMenuOpen(false)}>ATS + PDF</a>
                <Link href="/examples" onClick={() => setMenuOpen(false)}>Examples</Link>
                <a href="#pricing" onClick={() => setMenuOpen(false)}>Free</a>
                <Link href="/login?next=/dashboard" onClick={() => setMenuOpen(false)}>Log in</Link>
              </div>
            ) : null}
          </nav>
        </header>

        <main id="homepage-content" tabIndex={-1}>
          <section id="hero-section" className={styles.hero}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  <span>01</span>
                  One source. Three useful formats.
                </p>
                <h1>{SITE_TAGLINE}.</h1>
                <p className={styles.brandLine}>
                  {SITE_DESCRIPTION}
                </p>
                <p className={styles.heroDescription}>
                  Start with the résumé you already have. Turn it into a professional page, a
                  PDF you can tailor for a role, and a Share Card—all from one truthful source.
                </p>
                <div className={styles.heroActions}>
                  <Link href={getSignupHref("landing_start_free")} className={styles.primaryButton}>
                    Build from my résumé — free
                    <ArrowIcon />
                  </Link>
                  <a href="#demo-section" className={styles.secondaryButton}>Try the live sample</a>
                </div>
                <p className={styles.freeLine}>
                  <CheckIcon />
                  Free to build, publish, host, download, and keep current. No credit card. No
                  trial. No hidden charges.
                </p>
              </div>

              <div id="demo-section" className={styles.heroDemo}>
                <div className={styles.demoHeader}>
                  <div>
                    <p>Live product story</p>
                    <strong>What do you need to be understood for?</strong>
                  </div>
                  <span>Sample data</span>
                </div>
                <div className={styles.momentTabs} role="group" aria-label="Professional moment">
                  {MOMENTS.map((item, index) => (
                    <button
                      key={item.id}
                      id={`professional-moment-${item.id}`}
                      type="button"
                      aria-pressed={moment === item.id}
                      aria-controls="professional-output-panel"
                      onClick={() => setMoment(item.id)}
                      className={moment === item.id ? styles.momentActive : undefined}
                    >
                      <span>0{index + 1}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={styles.transformationStage}>
                  <SourceResume />
                  <div className={styles.flowLine} aria-hidden="true">
                    <span />
                    <b>SHAPE</b>
                    <span />
                  </div>
                  <div className={styles.outputFrame}>
                    <div className={styles.outputMeta}>
                      <div>
                        <span>Comes forward</span>
                        <strong>{activeMoment.output}</strong>
                      </div>
                      <span className={styles.outputNumber}>{String(MOMENTS.findIndex((item) => item.id === moment) + 1).padStart(2, "0")}</span>
                    </div>
                    <span className={styles.srOnly} role="status" aria-live="polite">
                      {activeMoment.output}. {activeMoment.note}
                    </span>
                    <ActiveOutput
                      moment={moment}
                      themeId={themeId}
                    />
                    <p className={styles.outputNote}>{activeMoment.note}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.heroFoot}>
              <span>Private until you publish</span>
              <span>Review every imported field</span>
              <span>Selectable-text PDF</span>
              <span>One link stays current</span>
            </div>
          </section>

          <div className={styles.quietCanvas}>
            <section id="how" className={`${styles.section} ${styles.revealSection}`} data-reveal>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}><span>02</span>Start where you are</p>
                <h2>Already have a résumé? Good. Start there.</h2>
                <p>
                  Upload a file or paste the text. We fill in as much as we can, then put you in
                  control of every field before anything is published.
                </p>
              </div>
              <div className={styles.importGrid}>
                <div className={styles.importPanel}>
                  <div className={styles.panelTopline}>
                    <span>Résumé import</span>
                    <b>Step 1 of 3</b>
                  </div>
                  <div className={styles.importChoices}>
                    <button
                      type="button"
                      aria-pressed={importMode === "upload"}
                      className={importMode === "upload" ? styles.importChoiceActive : undefined}
                      onClick={() => setImportMode("upload")}
                    >
                      Upload a file
                    </button>
                    <button
                      type="button"
                      aria-pressed={importMode === "paste"}
                      className={importMode === "paste" ? styles.importChoiceActive : undefined}
                      onClick={() => setImportMode("paste")}
                    >
                      Paste résumé text
                    </button>
                  </div>
                  <div className={styles.dropZone}>
                    {importMode === "upload" ? (
                      <>
                        <span className={styles.uploadMark}>↑</span>
                        <strong>Upload your résumé after signup</strong>
                        <p>PDF, DOCX, TXT, or Markdown · up to 6 MB</p>
                        <Link href={getSignupHref("landing_import_upload")}>Start with my résumé</Link>
                      </>
                    ) : (
                      <>
                        <strong>Paste the résumé text you already have</strong>
                        <p>You review every field after autofill.</p>
                        <textarea
                          className={styles.pasteArea}
                          aria-label="Sample pasted résumé text"
                          readOnly
                          value={"Avery Morgan\nSenior Product Lead\n\nLed a TypeScript and SQL platform serving 2M+ requests daily."}
                        />
                      </>
                    )}
                  </div>
                  <div className={styles.importedFile}>
                    <span>DOC</span>
                    <div>
                      <strong>{importMode === "upload" ? "Avery-Morgan-Resume.pdf" : "Pasted résumé text"}</strong>
                      <small>Parsed successfully · 8 sections found</small>
                    </div>
                    <b>100%</b>
                  </div>
                </div>
                <ol className={styles.importSteps}>
                  <li className={styles.stepCurrent}>
                    <span>01</span>
                    <div><strong>Bring it in</strong><p>Upload a file or paste your résumé text.</p></div>
                    <b>Current</b>
                  </li>
                  <li>
                    <span>02</span>
                    <div><strong>Review the autofill</strong><p>Correct, improve, or remove any field.</p></div>
                  </li>
                  <li>
                    <span>03</span>
                    <div><strong>Publish + download</strong><p>Create the page, PDF, and shareable card.</p></div>
                  </li>
                </ol>
              </div>
            </section>

            <section
              id="ats"
              className={`${styles.section} ${styles.atsSection} ${styles.revealSection}`}
              data-reveal
            >
              <div className={styles.atsIntro}>
                <p className={styles.eyebrow}><span>03</span>Be found for work you have actually done</p>
                <h2>One story. Two readers.</h2>
                <p className={styles.lead}>
                  A person reads for meaning. Hiring software looks for recognizable details. We
                  help make the same truthful experience clear to both.
                </p>
                <dl className={styles.definitions}>
                  <div>
                    <dt>ATS</dt>
                    <dd>Software that collects applications and pulls out details like titles, skills, and dates.</dd>
                  </div>
                  <div>
                    <dt>AI-assisted search</dt>
                    <dd>Tools that look for clear evidence matching a request.</dd>
                  </div>
                  <div>
                    <dt>Optimization</dt>
                    <dd>Real text, familiar headings, specific terms, and truthful emphasis—not tricks.</dd>
                  </div>
                </dl>
              </div>

              <div className={styles.searchDemo}>
                <div className={styles.panelTopline}>
                  <span>Searchability demonstration</span>
                  <b>Truthful matches only</b>
                </div>
                <div className={styles.searchField}>
                  <SearchIcon />
                  <span>Senior product leader with TypeScript, SQL, and large-scale systems experience</span>
                  <kbd>Search</kbd>
                </div>
                <div className={styles.searchBody}>
                  <div className={styles.matchList}>
                    <div className={styles.matchSummary}>
                      <strong>5 matching details to review</strong>
                      <span>Already in Avery&apos;s experience</span>
                    </div>
                    {[
                      ["Senior Product Lead", "Title"],
                      ["TypeScript", "Skill"],
                      ["SQL", "Skill"],
                      ["Large-scale platform architecture", "Experience"],
                      ["2M+ requests per day", "Measured result"],
                    ].map(([value, label]) => (
                      <div key={value} className={styles.matchRow}>
                        <CheckIcon />
                        <div><strong>{value}</strong><span>{label}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.pdfResult}>
                    <span className={styles.documentCorner}>PDF</span>
                    <p>TARGETED VERSION YOU REVIEW</p>
                    <strong>Senior Product &amp; Platform Lead</strong>
                    <div className={styles.resultLines}><span /><span /><span /><span /></div>
                    <div className={styles.resultEvidence}>5 matching details available to emphasize</div>
                    <Link href={getSignupHref("landing_ats_pdf")} className={styles.pdfResultAction}>
                      Build + download yours <span>→</span>
                    </Link>
                  </div>
                </div>
                <p className={styles.truthNote}>
                  Compare what already matches, choose what to clarify or emphasize, then export.
                  MyLivingPage never invents experience or promises a ranking.
                </p>
                <p className={styles.atsDisclosure}>{ATS_READINESS_DISCLOSURE}</p>
                <div className={styles.guideLinks}>
                  <Link href="/guides/resume-pdf-check?ref=landing_pricing_guides">
                    Run the résumé PDF check
                  </Link>
                  <Link href="/guides/recruiter-search-keywords?ref=landing_pricing_guides">
                    Learn how recruiter keyword search works
                  </Link>
                </div>
              </div>
            </section>

            <section id="themes" className={`${styles.section} ${styles.revealSection}`} data-reveal>
              <div className={styles.identityHeading}>
                <div>
                  <p className={styles.eyebrow}><span>04</span>Simple, never generic</p>
                  <h2>Same experience. Sharper emphasis.</h2>
                </div>
                <p>
                  Simplicity makes your value easier to see without flattening what makes you
                  different. The facts remain consistent; the lead meets the moment.
                </p>
              </div>

              <div className={styles.identityGrid}>
                <div className={styles.momentMatrix}>
                  {MOMENTS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={moment === item.id}
                      onClick={() => setMoment(item.id)}
                      className={moment === item.id ? styles.matrixActive : undefined}
                    >
                      <span>0{index + 1}</span>
                      <span className={styles.momentCopy}>
                        <strong>{item.shortLabel}</strong>
                        <span className={styles.momentDescription}>{item.note}</span>
                      </span>
                      <b>{item.output}</b>
                    </button>
                  ))}
                </div>

                <div className={styles.visualDirections}>
                  <div className={styles.panelTopline}>
                    <span>Visual direction</span>
                    <b>Choose what feels like you</b>
                  </div>
                  <div className={styles.themeGrid}>
                    {THEME_DIRECTIONS.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={themeId === theme.id}
                        onClick={() => setThemeId(theme.id)}
                        className={themeId === theme.id ? styles.themeSelected : undefined}
                      >
                        <span className={`${styles.themeArtwork} ${theme.className}`}>
                          <span className={styles.themeMiniLabel}>{theme.themeName}</span>
                          <b>AVERY<br />MORGAN</b>
                          <i />
                          <i />
                          <i />
                        </span>
                        <span className={styles.themeCaption}>
                          <strong>{theme.label}</strong>
                          <span>{theme.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.selectionSummary} aria-live="polite">
                    <span>Current direction</span>
                    <strong>{activeMoment.shortLabel} · {activeMoment.output}</strong>
                    <p>{activeMoment.note}</p>
                    <b>{THEME_DIRECTIONS.find((theme) => theme.id === themeId)?.label}</b>
                  </div>
                  <p className={styles.sampleLabel}>Sample profile · Built with example data</p>
                </div>
              </div>
            </section>

            <section className={`${styles.section} ${styles.shareSection} ${styles.revealSection}`} data-reveal>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}><span>05</span>One link stays useful</p>
                <h2>Easy to pass along. Easy to follow up.</h2>
                <p>
                  Use it in an application follow-up, referral, email signature, or in-person
                  conversation. The same page stays current everywhere it was shared.
                </p>
              </div>
              <div className={styles.shareFlow}>
                <div>
                  <span>01</span>
                  <div className={styles.flowPage}><b>AVERY</b><i /><i /><i /></div>
                  <strong>Living Page</strong>
                  <p>One link to the complete story</p>
                </div>
                <span className={styles.flowArrow}>→</span>
                <div>
                  <span>02</span>
                  <div className={styles.flowCard}><b>AVERY MORGAN</b><i>▦</i></div>
                  <strong>Share Card + QR</strong>
                  <p>Easy to send or hand over</p>
                </div>
                <span className={styles.flowArrow}>→</span>
                <div>
                  <span>03</span>
                  <div className={styles.flowPhone}><div><b>AVERY</b><i /><i /></div></div>
                  <strong>Someone opens it</strong>
                  <p>The latest page appears</p>
                </div>
                <span className={styles.flowArrow}>→</span>
                <div>
                  <span>04</span>
                  <div className={styles.flowSignal}><i /><b>PAGE VIEWED</b><p>Opened on mobile<br />moments ago</p></div>
                  <strong>A useful signal</strong>
                  <p>Follow up with better timing</p>
                </div>
              </div>
            </section>

            <section id="pricing" className={`${styles.section} ${styles.revealSection}`} data-reveal>
              <div className={styles.freePanel}>
                <div className={styles.freeCopy}>
                  <p className={styles.eyebrow}><span>06</span>Free means the finished product</p>
                  <h2>Build it. Publish it. Host it. Download it. Free.</h2>
                  <p>
                    Everything demonstrated here is included. There is no publishing fee,
                    download fee, hosting fee, trial expiration, or credit card requirement.
                  </p>
                  <Link href={getSignupHref("landing_pricing_start")} className={styles.primaryButton}>
                    Build from my résumé — free
                    <ArrowIcon />
                  </Link>
                </div>
                <div className={styles.freeChecklist}>
                  {[
                    "Résumé import + autofill",
                    "Hosted Living Page",
                    "ATS-ready PDF downloads",
                    "Targeted versions",
                    "Share Card + QR code",
                    "Page-view insights",
                    "Updates after publishing",
                    "No card or hidden charges",
                  ].map((item) => (
                    <div key={item}><CheckIcon /><span>{item}</span></div>
                  ))}
                </div>
                <nav className={styles.trustLinks} aria-label="Product trust and resource links">
                  <Link href="/pricing">See everything included</Link>
                  <Link href="/guides/living-page-vs-pdf-resume">Living Page + PDF guide</Link>
                  <Link href="/security">Security details</Link>
                  <Link href="/delete-account">Deletion options</Link>
                </nav>
              </div>
            </section>

            <section id="final-cta" className={`${styles.finalCta} ${styles.revealSection}`} data-reveal>
              <p className={styles.eyebrow}><span>07</span>Your experience belongs here</p>
              <h2>Structured for software. Memorable to people. Ready to share anywhere.</h2>
              <p>One source of professional truth, shaped around what you need next.</p>
              <div className={styles.heroActions}>
                <Link href={getSignupHref("landing_final_start")} className={styles.primaryButton}>
                  Build from my résumé — free
                  <ArrowIcon />
                </Link>
                <Link href="/examples" className={styles.secondaryButton}>View sample pages</Link>
              </div>
              <small>Publish, host, download, and update for free. No credit card or hidden charges.</small>
            </section>
          </div>
        </main>

      </div>
    </div>
  );
}
