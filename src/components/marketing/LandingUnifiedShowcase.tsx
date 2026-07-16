"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import { ShareCardArtwork } from "@/components/ShareCardArtwork";
import ThemeCanvas from "@/components/ThemeCanvas";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import { DEMO_PAGES } from "@/lib/demo-data";
import {
  buildQrDataUrl,
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
  { id: "ember", label: "Ember" },
  { id: "aurora", label: "Aurora" },
  { id: "matrix", label: "Matrix" },
] as const satisfies ReadonlyArray<{ id: ThemeId; label: string }>;

const SHOWCASE_VIEWS = [
  { id: "living-page", label: "Living Page" },
  { id: "share-card-qr", label: "Share Card + QR" },
] as const;

type ShowcaseThemeId = (typeof SHOWCASE_THEMES)[number]["id"];
type ShowcaseViewId = (typeof SHOWCASE_VIEWS)[number]["id"];

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

function moveTabSelection<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: ReadonlyArray<{ id: T }>,
  currentId: T,
  setCurrentId: (id: T) => void,
  idPrefix: string,
) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

  event.preventDefault();
  const currentIndex = options.findIndex((option) => option.id === currentId);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % options.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + options.length) % options.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = options.length - 1;

  const next = options[nextIndex];
  if (!next) return;
  setCurrentId(next.id);
  requestAnimationFrame(() => document.getElementById(`${idPrefix}-${next.id}`)?.focus());
}

function ShareCardPreview({ themeId }: { themeId: ShowcaseThemeId }) {
  const resume = SHOWCASE_RESUME;
  if (!resume) return null;

  const slug = slugifyUsername(resume.name || "member");
  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const livePageUrl = toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, slug), 36);
  const visual = getShareCardVisual(themeId);
  const shareTags = getShareCardTags(resume);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const safeName = truncate(resume.name || "MyLivingPage User", 34);
  const safeHeadline = truncate(resume.headline || "Professional profile", 60);

  return (
    <div data-testid="landing-share-card-preview">
      <ProfileWindow
        title="Share card output // fictional sample"
        status={<span>{THEME_MAP[themeId].name} skin</span>}
        contentClassName="p-3 sm:p-4"
      >
        <ShareCardArtwork
          avatarUrl={resume.avatar_url}
          displayUrl={displayUrl}
          eyebrow="PNG Share Card Preview"
          headline={safeHeadline}
          location={resume.location || undefined}
          name={safeName}
          qrAlt={`QR code preview for ${displayUrl}`}
          qrDataUrl={qrDataUrl}
          slug={slug}
          tags={shareTags}
          visual={visual}
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#DBEAFE]">
          <span className="border border-[rgba(147,197,253,0.22)] bg-[rgba(59,130,246,0.08)] px-2 py-1">Copy Link</span>
          <span className="border border-[rgba(147,197,253,0.22)] bg-[rgba(59,130,246,0.08)] px-2 py-1">Download PNG</span>
        </div>
      </ProfileWindow>
    </div>
  );
}

export default function LandingUnifiedShowcase() {
  const [themeId, setThemeId] = useState<ShowcaseThemeId>("ember");
  const [viewId, setViewId] = useState<ShowcaseViewId>("living-page");

  if (!SHOWCASE_RESUME) return null;

  const theme = THEME_MAP[themeId];
  const slug = slugifyUsername(SHOWCASE_RESUME.name || "member");
  const livePageUrl = toLivePageUrl(normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL), slug);

  return (
    <section id="demo-section" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-24">
          <ProfileWindow title="Live demo controls" status="fictional sample" contentClassName="p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">
              See it in action
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold leading-none text-[#F7F1E8]">
              One story. Three useful outputs.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
              Change the page skin, then switch between a living profile and its matching QR share card. The ATS-ready PDF stays clean and conventional.
            </p>

            <fieldset className="mt-5">
              <legend className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.52)]">
                Choose a page skin
              </legend>
              <div role="tablist" aria-label="Theme selection" className="mt-2 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                {SHOWCASE_THEMES.map((themeOption) => {
                  const isActive = themeOption.id === themeId;
                  return (
                    <button
                      key={themeOption.id}
                      id={`theme-tab-${themeOption.id}`}
                      type="button"
                      role="tab"
                      tabIndex={isActive ? 0 : -1}
                      aria-selected={isActive}
                      aria-controls="landing-showcase-panel"
                      onClick={() => setThemeId(themeOption.id)}
                      onKeyDown={(event) => moveTabSelection(event, SHOWCASE_THEMES, themeId, setThemeId, "theme-tab")}
                      className={`min-h-11 border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                        isActive
                          ? "border-[#60A5FA] bg-[rgba(59,130,246,0.24)] text-[#EFF6FF]"
                          : "border-[rgba(147,197,253,0.16)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.58)] hover:bg-[rgba(59,130,246,0.1)] hover:text-[#DBEAFE]"
                      }`}
                    >
                      {themeOption.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.52)]">
                Preview format
              </legend>
              <div role="tablist" aria-label="Preview mode" className="mt-2 grid gap-1.5">
                {SHOWCASE_VIEWS.map((viewOption) => {
                  const isActive = viewOption.id === viewId;
                  return (
                    <button
                      key={viewOption.id}
                      id={`view-tab-${viewOption.id}`}
                      type="button"
                      role="tab"
                      tabIndex={isActive ? 0 : -1}
                      aria-selected={isActive}
                      aria-controls="landing-showcase-panel"
                      onClick={() => setViewId(viewOption.id)}
                      onKeyDown={(event) => moveTabSelection(event, SHOWCASE_VIEWS, viewId, setViewId, "view-tab")}
                      className={`min-h-11 border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-[rgba(96,165,250,0.7)] bg-[rgba(59,130,246,0.18)] text-[#EFF6FF]"
                          : "border-[rgba(147,197,253,0.16)] text-[rgba(240,244,255,0.62)] hover:bg-[rgba(59,130,246,0.1)]"
                      }`}
                    >
                      {viewOption.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </ProfileWindow>

          <ProfilePanel title="What changes" meta="live preview" contentClassName="p-3">
            <p className="text-xs leading-5 text-[rgba(240,244,255,0.62)]">
              The skin changes the living page and share card. Your saved story and ATS-ready PDF stay aligned.
            </p>
            <div className="mt-3 grid gap-2">
              <Link href={getSignupHref("landing_demo_primary")} className="gold-pill px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em]">
                Create Your Page (Free)
              </Link>
              <Link href="/examples" className="profile-link py-1 text-center text-xs font-semibold">
                Browse sample pages
              </Link>
            </div>
          </ProfilePanel>
        </div>

        <div
          id="landing-showcase-panel"
          role="tabpanel"
          aria-labelledby={`theme-tab-${themeId} ${
            viewId === "living-page" ? "view-tab-living-page" : "view-tab-share-card-qr"
          }`}
          data-testid="landing-showcase"
          className="min-w-0"
        >
          {viewId === "living-page" ? (
            <ProfileWindow
              title={`${theme.name} living profile // fictional sample`}
              status={<span className="profile-status text-[#86EFAC]">published</span>}
              contentClassName="p-2 sm:p-3"
            >
              <div className="mb-2 grid gap-2 border border-[rgba(147,197,253,0.16)] bg-[rgba(2,8,23,0.54)] px-3 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#86EFAC]">Public profile</span>
                <span className="min-w-0 truncate font-mono text-[10px] text-[rgba(240,244,255,0.58)] sm:text-center">
                  {livePageUrl.replace(/^https?:\/\//, "")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.5)]">Sample data</span>
              </div>

              <div data-testid="landing-living-page-preview" className="overflow-hidden rounded-md border border-[rgba(255,255,255,0.1)]">
                <ThemeCanvas themeId={themeId} height={640} className="rounded-none" interactive>
                  <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.48)_100%)] p-2 sm:p-3">
                    <div className="h-full overflow-hidden rounded-md border border-[rgba(255,255,255,0.12)] bg-[rgba(8,14,28,0.22)]">
                      <ResumeLayout
                        data={SHOWCASE_RESUME}
                        profileSlug={slug}
                        compact
                        headingLevel="h2"
                        disableExternalLinks
                      />
                    </div>
                  </div>
                </ThemeCanvas>
              </div>

              <p className="mt-2 border border-[rgba(134,239,172,0.16)] bg-[rgba(34,197,94,0.07)] px-3 py-2 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
                Published profiles can record page views so you can see whether sharing led to interest.
              </p>
            </ProfileWindow>
          ) : (
            <ShareCardPreview themeId={themeId} />
          )}
        </div>
      </div>
    </section>
  );
}
