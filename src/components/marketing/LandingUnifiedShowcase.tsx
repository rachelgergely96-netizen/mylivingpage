"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { LandingStoryShareCard } from "@/components/marketing/LandingStoryShareCard";
import { LandingStorySystemOverlay } from "@/components/marketing/LandingStorySystemOverlay";
import { DEMO_PAGES } from "@/lib/demo-data";
import { normalizeAppUrl, toLivePageUrl } from "@/lib/share-card";
import { slugifyUsername } from "@/lib/usernames";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const STORY_RESUME = DEMO_PAGES[0]?.data;

const SHOWCASE_THEMES = [
  { id: "ember", label: "Ember" },
  { id: "aurora", label: "Aurora" },
  { id: "matrix", label: "Matrix" },
] as const satisfies ReadonlyArray<{ id: ThemeId; label: string }>;

const STORY_STEPS = [
  {
    id: "shape",
    number: "01",
    eyebrow: "Shape the story",
    title: "Same experience. Sharper emphasis.",
    body: "A job application, client conversation, and introduction may each need a different lead. Keep one source of truth, then bring the most relevant experience and proof forward.",
    note: "The facts stay true. The emphasis meets the moment.",
  },
  {
    id: "systems",
    number: "02",
    eyebrow: "Stay understandable",
    title: "Clear to people. Readable by software.",
    body: "An ATS is software employers use to collect applications and pull out details like job titles, dates, skills, and education. Clear sections and real text give those systems something reliable to read.",
    note: "AI searchability means your experience is specific enough to recognize—not that you are gaming a ranking.",
  },
  {
    id: "share",
    number: "03",
    eyebrow: "Make it easy to pass along",
    title: "Your page becomes a card people can actually share.",
    body: "The matching card carries your headline, a few useful signals, your link, and a QR code into messages, email signatures, introductions, and in-person conversations.",
    note: "It is a doorway to the full story, not another profile to maintain.",
  },
  {
    id: "signal",
    number: "04",
    eyebrow: "Keep the connection alive",
    title: "One link stays current after it leaves your hands.",
    body: "When someone opens the card or link, they reach the latest version of your page. You can see that it landed and follow up with better timing.",
    note: "Update the page once. Every place you shared it points to what is current.",
  },
] as const;

type StoryStageId = (typeof STORY_STEPS)[number]["id"];
type ShowcaseThemeId = (typeof SHOWCASE_THEMES)[number]["id"];

const PAGE_STAGE_CLASSES: Record<StoryStageId, string> = {
  shape: "translate-x-0 translate-y-0 scale-100 opacity-100 rotate-0",
  systems: "-translate-x-[4%] translate-y-[2%] scale-[0.96] opacity-[0.55] rotate-0",
  share: "-translate-x-[18%] translate-y-[6%] scale-[0.8] opacity-35 -rotate-1",
  signal: "-translate-x-[24%] translate-y-[8%] scale-[0.72] opacity-25 -rotate-2",
};

const CARD_STAGE_CLASSES: Record<StoryStageId, string> = {
  shape: "translate-x-[31%] translate-y-[34%] scale-[0.5] opacity-95 rotate-3",
  systems: "translate-x-[31%] translate-y-[34%] scale-[0.46] opacity-25 rotate-3",
  share: "translate-x-0 translate-y-[3%] scale-[0.92] opacity-100 rotate-0",
  signal: "-translate-x-[24%] translate-y-[8%] scale-[0.64] opacity-65 -rotate-2",
};

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export default function LandingUnifiedShowcase() {
  const [themeId, setThemeId] = useState<ShowcaseThemeId>("ember");
  const [activeStage, setActiveStage] = useState<StoryStageId>("shape");
  const [reducedMotion, setReducedMotion] = useState(false);
  const storyRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReducedMotion(motionQuery.matches);

    syncMotionPreference();
    motionQuery.addEventListener?.("change", syncMotionPreference);
    return () => motionQuery.removeEventListener?.("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const story = storyRef.current;
    if (!story || reducedMotion || !("IntersectionObserver" in window)) {
      return;
    }

    const steps = Array.from(story.querySelectorAll<HTMLElement>("[data-story-step]"));
    const visibility = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibility.set(entry.target, entry.intersectionRatio));
        const next = steps.reduce<{ element: HTMLElement; ratio: number } | null>((best, element) => {
          const ratio = visibility.get(element) ?? 0;
          return !best || ratio > best.ratio ? { element, ratio } : best;
        }, null);
        const stage = next?.element.dataset.storyStep as StoryStageId | undefined;
        if (stage && next && next.ratio > 0.16) {
          setActiveStage(stage);
        }
      },
      {
        rootMargin: "-28% 0px -42% 0px",
        threshold: [0, 0.16, 0.32, 0.5, 0.72],
      },
    );

    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [reducedMotion]);

  const activeStep = STORY_STEPS.find((step) => step.id === activeStage) ?? STORY_STEPS[0];

  if (!STORY_RESUME) {
    return null;
  }

  const theme = THEME_MAP[themeId];
  const slug = slugifyUsername(STORY_RESUME.name || "member");
  const livePageUrl = toLivePageUrl(normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL), slug);
  const signalActive = activeStage === "signal";

  return (
    <section
      ref={storyRef}
      id="demo-section"
      data-testid="homepage-story"
      data-active-stage={activeStage}
      data-motion={reducedMotion ? "reduced" : "full"}
      className="landing-story mx-auto w-full max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 md:px-10 lg:pb-28"
    >
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E5B76B]">One page. Many moments.</p>
        <h2 className="mt-4 font-heading text-[2.35rem] font-bold leading-[0.98] tracking-[-0.04em] text-[#F7F1E8] sm:text-5xl md:text-6xl">
          Watch one professional story adapt as you scroll.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.64)] sm:text-lg sm:leading-8">
          The page, ATS-ready résumé, and share card come from the same information—so every version stays recognizable, useful, and yours.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
        <ol className="order-2 lg:order-1">
          {STORY_STEPS.map((step) => {
            const isActive = activeStage === step.id;
            return (
              <li
                key={step.id}
                data-story-step={step.id}
                className="flex min-h-[22rem] items-center py-5 sm:min-h-[24rem] lg:min-h-[68svh] lg:py-10"
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveStage(step.id)}
                  onFocus={() => setActiveStage(step.id)}
                  className={`story-copy-card w-full rounded-[1.75rem] border p-6 text-left transition-[border-color,background-color,box-shadow,transform] duration-500 ease-soft sm:p-8 ${
                    isActive
                      ? "is-active border-[rgba(147,197,253,0.26)] bg-[rgba(13,27,47,0.86)] shadow-[0_24px_80px_rgba(2,6,23,0.32)] lg:translate-x-2"
                      : "border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.56)] hover:border-[rgba(147,197,253,0.16)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs ${isActive ? "text-[#93C5FD]" : "text-[rgba(240,244,255,0.3)]"}`}>
                      {step.number}
                    </span>
                    <span className={`h-px w-8 ${isActive ? "bg-[#3B82F6]" : "bg-[rgba(255,255,255,0.12)]"}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isActive ? "text-[#BFDBFE]" : "text-[rgba(240,244,255,0.42)]"}`}>
                      {step.eyebrow}
                    </span>
                  </div>
                  <h3 className="mt-5 font-heading text-[1.85rem] font-bold leading-[1.04] tracking-[-0.025em] text-[#F0F4FF] sm:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[rgba(240,244,255,0.66)] sm:text-base">
                    {step.body}
                  </p>
                  <p className="mt-5 border-l border-[rgba(229,183,107,0.32)] pl-4 text-xs leading-6 text-[rgba(245,215,162,0.7)] sm:text-sm">
                    {step.note}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="order-1 self-start lg:order-2 lg:sticky lg:top-24">
          <div className="story-stage-glass rounded-[2rem] border border-[rgba(255,255,255,0.11)] bg-[rgba(7,16,31,0.76)] p-3 shadow-[0_38px_110px_rgba(2,6,23,0.48)] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3 sm:px-2 sm:pb-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.36)]">Live story preview</p>
                <p className="mt-1 text-xs font-semibold text-[#F0F4FF] sm:text-sm">{activeStep.eyebrow}</p>
              </div>
              <div role="tablist" aria-label="Preview theme" className="flex flex-wrap gap-1.5">
                {SHOWCASE_THEMES.map((themeOption) => {
                  const isActive = themeId === themeOption.id;
                  return (
                    <button
                      key={themeOption.id}
                      id={`theme-tab-${themeOption.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="landing-showcase-panel"
                      onClick={() => setThemeId(themeOption.id)}
                      className={`rounded-full border px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] transition-colors sm:text-[9px] ${
                        isActive
                          ? "border-[rgba(229,183,107,0.36)] bg-[rgba(229,183,107,0.1)] text-[#F7F1E8]"
                          : "border-[rgba(255,255,255,0.1)] text-[rgba(240,244,255,0.46)] hover:text-[#F0F4FF]"
                      }`}
                    >
                      {themeOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div role="group" aria-label="Story chapter" className="grid grid-cols-4 gap-1.5 pb-3 lg:hidden">
              {STORY_STEPS.map((step) => {
                const isActive = activeStage === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-label={`Show chapter: ${step.eyebrow}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveStage(step.id)}
                    className={`min-w-0 rounded-xl border px-1.5 py-2 text-center transition-colors ${
                      isActive
                        ? "border-[rgba(147,197,253,0.3)] bg-[rgba(59,130,246,0.12)] text-[#BFDBFE]"
                        : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] text-[rgba(240,244,255,0.44)]"
                    }`}
                  >
                    <span className="block font-mono text-[8px]">{step.number}</span>
                    <span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-[0.08em]">
                      {step.eyebrow.replace(" the story", "")}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              id="landing-showcase-panel"
              role="tabpanel"
              aria-labelledby={`theme-tab-${themeId}`}
              data-testid="landing-showcase"
              className="relative h-[430px] overflow-hidden rounded-[1.55rem] border border-[rgba(255,255,255,0.1)] bg-[#050C18] sm:h-[520px] lg:h-[min(66svh,670px)] lg:min-h-[560px]"
            >
              <div className="absolute inset-x-0 top-0 z-40 flex h-10 items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(5,12,24,0.9)] px-3 sm:h-11 sm:px-4">
                <div className="hidden gap-1 sm:flex" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-[rgba(255,255,255,0.05)] px-2.5 py-1 font-mono text-[8px] text-[rgba(240,244,255,0.42)] sm:text-[10px]">
                  <span className="text-[#5BD67C]" aria-hidden="true">&#x1F512;</span>
                  <span className="truncate">{livePageUrl.replace(/^https?:\/\//, "")}</span>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 top-10 overflow-hidden sm:top-11">
                <div
                  data-testid="story-page-preview"
                  data-theme-id={themeId}
                  className={`story-page-layer absolute inset-0 z-10 transition-[transform,opacity] duration-700 ease-soft ${PAGE_STAGE_CLASSES[activeStage]}`}
                >
                  <div data-testid="landing-living-page-preview" className="h-full">
                    <ThemeCanvas
                      themeId={themeId}
                      height="100%"
                      className="h-full rounded-none"
                      interactive={false}
                    >
                      <div className="h-full p-2.5 sm:p-3">
                        <div className="theme-surface h-full overflow-hidden rounded-[1.15rem] border">
                          <ResumeLayout data={STORY_RESUME} compact headingLevel="h2" disableExternalLinks />
                        </div>
                      </div>
                    </ThemeCanvas>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-[10%] left-[5%] z-[15] rounded-full border border-[rgba(147,197,253,0.22)] bg-[rgba(5,12,24,0.9)] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE] shadow-[0_14px_34px_rgba(2,6,23,0.4)] transition-[transform,opacity] duration-500 sm:text-[9px] ${
                    activeStage === "shape"
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  }`}
                >
                  Focused for senior platform roles
                </div>

                <div
                  data-testid="landing-share-card-preview"
                  className={`story-card-layer pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-3 transition-[transform,opacity] duration-700 ease-soft sm:p-8 ${CARD_STAGE_CLASSES[activeStage]}`}
                >
                  <div className="w-full max-w-lg">
                    <LandingStoryShareCard themeId={themeId} />
                  </div>
                </div>

                <LandingStorySystemOverlay active={activeStage === "systems"} />

                <div
                  aria-hidden={!signalActive}
                  data-testid="story-signal-preview"
                  className={`story-signal-layer absolute inset-0 z-30 ${signalActive ? "is-active" : ""}`}
                >
                  <div className="absolute right-[8%] top-[10%] h-[70%] w-[45%] max-w-[230px] overflow-hidden rounded-[1.7rem] border-[5px] border-[#111B2A] bg-[#07111F] shadow-[0_28px_80px_rgba(2,6,23,0.62)] sm:border-[7px]">
                    <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[rgba(255,255,255,0.15)]" />
                    <div
                      className="mt-3 h-20 p-3"
                      style={{ background: `linear-gradient(135deg, ${theme.presentation.accentSoft}, transparent)` }}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#07111F]"
                        style={{ background: theme.presentation.accent }}
                      >
                        A
                      </div>
                      <div className="mt-2 h-1.5 w-20 rounded-full bg-white/70" />
                      <div className="mt-1.5 h-1 w-14 rounded-full bg-white/25" />
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="h-12 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                        <div className="h-1 w-12 rounded-full bg-white/40" />
                        <div className="mt-2 h-1 w-full rounded-full bg-white/10" />
                        <div className="mt-1 h-1 w-3/4 rounded-full bg-white/10" />
                      </div>
                      <div className="h-12 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                        <div className="h-1 w-16 rounded-full bg-white/40" />
                        <div className="mt-2 h-1 w-full rounded-full bg-white/10" />
                        <div className="mt-1 h-1 w-2/3 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>

                  <div className="story-view-signal absolute bottom-[9%] left-[7%] max-w-[230px] rounded-2xl border border-[rgba(91,214,124,0.28)] bg-[rgba(5,12,24,0.94)] p-3 shadow-[0_18px_60px_rgba(2,6,23,0.56)] sm:p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#5BD67C]" />
                      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#86EFAC] sm:text-[9px]">Page viewed</p>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-[#F0F4FF] sm:text-xs">Someone opened Avery’s page</p>
                    <p className="mt-1 text-[8px] text-[rgba(240,244,255,0.46)] sm:text-[9px]">Viewed on mobile moments ago</p>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 z-40 flex gap-1.5 sm:bottom-4 sm:left-4">
                {STORY_STEPS.map((step) => (
                  <span
                    key={step.id}
                    className={`h-1 rounded-full transition-[width,background-color] duration-500 ${
                      activeStage === step.id ? "w-7 bg-[#3B82F6]" : "w-2 bg-[rgba(255,255,255,0.18)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 px-2 text-center text-[10px] leading-5 text-[rgba(240,244,255,0.4)] sm:text-xs">
            Select a chapter or keep scrolling. The preview and card always use the same saved information.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:mt-2">
        <Link
          href={getSignupHref("landing_story_primary")}
          className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.28)]"
        >
          Create Your Page — Free
        </Link>
        <Link href="/examples" className="px-4 py-3 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]">
          Browse sample pages
        </Link>
      </div>
    </section>
  );
}
