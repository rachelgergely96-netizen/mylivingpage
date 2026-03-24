"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { DEMO_PAGES } from "@/lib/demo-data";
import {
  buildQrDataUrl,
  getFirstName,
  getShareCardTags,
  getShareCardVisual,
  normalizeAppUrl,
  toDisplayDomainUrl,
  toLivePageUrl,
  truncate,
} from "@/lib/share-card";
import { slugifyUsername } from "@/lib/usernames";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const SHOWCASE_RESUME = DEMO_PAGES[0]?.data;

const SHOWCASE_THEMES = [
  { id: "ember", label: "Ember", premium: false },
  { id: "aurora", label: "Aurora", premium: false },
  { id: "matrix", label: "Matrix", premium: true },
] as const satisfies ReadonlyArray<{ id: ThemeId; label: string; premium: boolean }>;

const SHOWCASE_VIEWS = [
  { id: "living-page", label: "Living Page", premium: false },
  { id: "share-card-qr", label: "Share Card + QR", premium: true },
] as const;

type ShowcaseThemeId = (typeof SHOWCASE_THEMES)[number]["id"];
type ShowcaseViewId = (typeof SHOWCASE_VIEWS)[number]["id"];

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

function ShareCardPreview({ themeId }: { themeId: ShowcaseThemeId }) {
  const resume = SHOWCASE_RESUME;

  if (!resume) {
    return null;
  }

  const slug = slugifyUsername(resume.name || "member");
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const livePageUrl = toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, slug), 36);
  const visual = getShareCardVisual(themeId);
  const shareTags = getShareCardTags(resume);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const safeName = truncate(resume.name || "MyLivingPage User", 34);
  const safeHeadline = truncate(resume.headline || "Professional profile", 60);
  const firstName = getFirstName(safeName);
  const initial = safeName.slice(0, 1).toUpperCase() || "?";

  return (
    <div
      data-testid="landing-share-card-preview"
      className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(255,255,255,0.1)] p-5 sm:p-6"
      style={{
        background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 70px ${visual.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full"
        style={{ background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)` }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[26rem]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(240,244,255,0.58)]">
            PNG Share Card Preview
          </p>
          <h3 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#F0F4FF] sm:text-4xl">
            {safeName}
          </h3>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.82)] sm:text-base">{safeHeadline}</p>
          <div className="mt-4 inline-flex rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(10,22,40,0.38)] px-3 py-1 text-xs text-[#93C5FD]">
            @{slug}
          </div>
        </div>

        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-heading text-2xl font-bold text-[#0A1628] shadow-[0_0_30px_rgba(0,0,0,0.3)]"
          style={{ background: `linear-gradient(135deg, ${visual.accent}, #E2E8F0)` }}
          aria-hidden="true"
        >
          {initial}
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {shareTags.map((tag) => (
          <span
            key={tag}
            className="max-w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.4)] px-3 py-1 text-xs leading-5 text-[rgba(240,244,255,0.78)] whitespace-normal break-words"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="relative mt-5 grid gap-4 rounded-[1.35rem] border border-[rgba(255,255,255,0.1)] bg-[rgba(6,14,28,0.54)] p-4 sm:grid-cols-[minmax(0,1fr)_144px] sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#F0F4FF]">Scan to visit {firstName}&rsquo;s living page</p>
          <p className="mt-1 text-xs leading-6 text-[rgba(240,244,255,0.56)]">
            The export includes a unique QR code and direct link for quick follow-up.
          </p>
        </div>

        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR code preview for ${displayUrl}`}
            className="h-32 w-32 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-white p-2 justify-self-start sm:justify-self-end"
          />
        ) : (
          <div className="h-32 w-32 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] sm:justify-self-end" />
        )}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
          Copy Link
        </span>
        <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)]">
          Download PNG
        </span>
      </div>

      <p className="relative mt-4 font-mono text-xs text-[rgba(240,244,255,0.56)]">{displayUrl}</p>
    </div>
  );
}

export default function LandingUnifiedShowcase() {
  const [themeId, setThemeId] = useState<ShowcaseThemeId>("ember");
  const [viewId, setViewId] = useState<ShowcaseViewId>("living-page");

  const activeView = useMemo(
    () => SHOWCASE_VIEWS.find((view) => view.id === viewId) ?? SHOWCASE_VIEWS[0],
    [viewId],
  );

  if (!SHOWCASE_RESUME) {
    return null;
  }

  const theme = THEME_MAP[themeId];
  const slug = slugifyUsername(SHOWCASE_RESUME.name || "member");
  const livePageUrl = toLivePageUrl(normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL), slug);

  return (
    <section id="demo-section" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
        <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E5B76B]">Unified demo</p>
          <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#F7F1E8] sm:text-4xl">
            One page. Always up to date.
          </h2>
          <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
            This uses one representative profile so the differences stay easy to scan. Preview the page, the share card, and the proof moment without leaving the homepage.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold text-[#F0F4FF]">Start with what you already have</p>
              <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.6)]">
                Bring in your resume once and shape the same story into something easier to send and easier to read.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold text-[#F0F4FF]">Know what happened after you shared it</p>
              <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.6)]">
                Switch between the page view and the QR-ready share card to see how one profile stays consistent across follow-up moments.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={getSignupHref("landing_demo_primary")}
              className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(229,183,107,0.2)]"
            >
              Create Your Page (Free)
            </Link>
            <Link
              href="/examples"
              className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
            >
              Browse sample pages
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.42)]">
                Theme
              </p>
              <div role="tablist" aria-label="Theme selection" className="mt-3 flex flex-wrap gap-2">
                {SHOWCASE_THEMES.map((themeOption) => {
                  const isActive = themeOption.id === themeId;
                  return (
                    <button
                      key={themeOption.id}
                      id={`theme-tab-${themeOption.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="landing-showcase-panel"
                      onClick={() => setThemeId(themeOption.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                        isActive
                          ? "border-[rgba(229,183,107,0.4)] bg-[rgba(229,183,107,0.12)] text-[#F7F1E8]"
                          : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.58)] hover:border-[rgba(229,183,107,0.24)] hover:text-[#F7F1E8]"
                      }`}
                    >
                      <span>{themeOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.42)]">
                Preview
              </p>
              <div role="tablist" aria-label="Preview mode" className="mt-3 flex flex-wrap gap-2">
                {SHOWCASE_VIEWS.map((viewOption) => {
                  const isActive = viewOption.id === viewId;
                  return (
                    <button
                      key={viewOption.id}
                      id={`view-tab-${viewOption.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="landing-showcase-panel"
                      onClick={() => setViewId(viewOption.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                        isActive
                          ? "border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] text-[#BFDBFE]"
                          : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.58)] hover:border-[rgba(59,130,246,0.22)] hover:text-[#BFDBFE]"
                      }`}
                    >
                      <span>{viewOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[rgba(240,244,255,0.62)]">
              <span className="font-semibold text-[#F0F4FF]">{theme.name}</span>
              <span className="mx-2 text-[rgba(240,244,255,0.28)]">/</span>
              <span>{activeView.label}</span>
            </div>
          </div>

          <div
            id="landing-showcase-panel"
            role="tabpanel"
            aria-labelledby={
              viewId === "living-page" ? "view-tab-living-page" : "view-tab-share-card-qr"
            }
            data-testid="landing-showcase"
            className="mt-5"
          >
            {viewId === "living-page" ? (
              <div className="relative overflow-hidden rounded-[1.6rem] border border-[rgba(255,255,255,0.08)] shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
                <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(8,14,28,0.9)] px-4 py-3">
                  <div className="hidden gap-[5px] sm:flex">
                    <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                    <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex flex-1 items-center gap-2 rounded-md bg-[rgba(255,255,255,0.05)] px-3 py-1.5 font-mono text-[11px] text-[rgba(240,244,255,0.44)]">
                    <span className="text-[#5BD67C]">&#x1F512;</span>
                    <span>{livePageUrl.replace(/^https?:\/\//, "")}</span>
                  </div>
                </div>

                <div data-testid="landing-living-page-preview" className="overflow-hidden">
                  <ThemeCanvas
                    themeId={themeId}
                    height={560}
                    className="rounded-none"
                    interactive
                  >
                    <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.56)_100%)] px-3 py-3 sm:px-4 sm:py-4">
                      <div className="h-full overflow-hidden rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(8,14,28,0.22)]">
                        <ResumeLayout data={SHOWCASE_RESUME} compact headingLevel="h2" disableExternalLinks />
                      </div>
                    </div>
                  </ThemeCanvas>
                </div>
                <div className="pointer-events-none absolute right-4 top-16 z-10 rounded-2xl border border-[rgba(91,214,124,0.28)] bg-[rgba(8,14,28,0.9)] px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.36)]">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#5BD67C]">
                    Proof
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#F0F4FF]">
                    Someone just looked at your page
                  </p>
                  <p className="mt-1 text-xs text-[rgba(240,244,255,0.56)]">
                    Viewed on mobile moments ago
                  </p>
                </div>
              </div>
            ) : (
              <ShareCardPreview themeId={themeId} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
