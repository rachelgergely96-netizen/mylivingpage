"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ShareCardProfileMark } from "@/components/ShareCardProfileMark";
import type { ShareIntentEventName } from "@/lib/analytics/proofSummary";
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
import type { ResumeData } from "@/types/resume";

interface ShareCardDownloadProps {
  pageId: string;
  isOwner: boolean;
  slug: string;
  themeId: string;
  resumeData: ResumeData;
  liveUrl?: string;
  variantId?: string | null;
  enabled?: boolean;
  analyticsHref?: string;
  analyticsCtaLabel?: string;
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function ShareCardDownload({
  pageId,
  isOwner,
  slug,
  themeId,
  resumeData,
  liveUrl,
  variantId = null,
  enabled = true,
  analyticsHref,
  analyticsCtaLabel = "Open Page Analytics",
  className,
}: ShareCardDownloadProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [appUrl, setAppUrl] = useState(() => normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL));
  const [shareFeedback, setShareFeedback] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppUrl(normalizeAppUrl(window.location.origin));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const trigger = triggerRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [open]);

  if (!isOwner) return null;
  if (!enabled) return null;

  const visual = getShareCardVisual(themeId);
  const safeName = truncate(resumeData.name || "MyLivingPage User", 40);
  const safeHeadline = truncate(resumeData.headline || "Professional profile", 78);
  const safeLocation = truncate(resumeData.location || "", 40);
  const firstName = getFirstName(safeName);
  const shareTags = getShareCardTags(resumeData);
  const livePageUrl = liveUrl ?? toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(
    liveUrl
      ? livePageUrl.replace(/^https?:\/\/(www\.)?/i, "")
      : toDisplayDomainUrl(appUrl, slug),
    42,
  );
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const initial = safeName.slice(0, 1).toUpperCase() || "?";
  const resolvedAnalyticsHref = analyticsHref ?? `/dashboard/analytics/${pageId}`;

  const trackShareIntent = async (eventName: ShareIntentEventName) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventName,
          metadata: {
            page_id: pageId,
            slug,
            variant_id: variantId,
          },
        }),
        keepalive: true,
      });
    } catch {
      // Share tracking should never interrupt the share action.
    }
  };

  const showProofFeedback = (title: string) => {
    setShareFeedback({
      title,
      body:
        "Once someone opens your page, you'll be able to see that people looked, whether they viewed on mobile, and how long they stayed reading.",
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) {
      return;
    }

    setDownloading(true);
    try {
      void trackShareIntent("page.share.download_card");
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: visual.background,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}-share-card.png`;
      a.click();
      showProofFeedback("Tracked share card downloaded");
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(livePageUrl);
      void trackShareIntent("page.share.copy_link");
      setCopied(true);
      showProofFeedback("Tracked page link copied");
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenLivePage = () => {
    void trackShareIntent("page.share.open_live_page");
    showProofFeedback("Tracked live page opened");
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-site-ui
        >
          <div
            ref={dialogRef}
            className="site-panel-raised max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-dialog-title"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4 border-b border-site-border px-5 py-4 sm:px-6">
              <div>
                <p className="site-eyebrow">Share Card</p>
                <h3 id="share-card-dialog-title" className="site-panel-title mt-2">{safeName}</h3>
                <p className="site-muted mt-1 text-sm">
                  Unique QR code and downloadable card for @{slug}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="site-icon-button shrink-0"
                aria-label="Close share card"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.25fr)_320px] sm:p-6">
              <div
                ref={cardRef}
                data-living-output
                data-theme-id={visual.themeId}
                data-theme-detail={visual.contentProfile}
                data-theme-collection={visual.collection}
                className="relative overflow-hidden rounded-none border p-5 sm:p-6"
                style={{
                  background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
                  borderColor: visual.border,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 60px ${visual.glow}`,
                }}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
                  style={{ background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)` }}
                />
                <ShareCardProfileMark
                  accent={visual.accent}
                  motif={visual.motif}
                  className="right-28 top-6"
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]"
                      style={{ color: visual.textSubtle }}
                    >
                      <span className="inline-block h-px w-5 rounded-full" style={{ background: visual.accent }} />
                      Personalized Share Card
                    </div>
                    <h4
                      className={`mt-3 text-3xl font-bold leading-tight sm:text-4xl ${
                        visual.headingFont === "editorial" ? "font-heading" : "font-body"
                      }`}
                      style={{ color: visual.text }}
                    >
                      {safeName}
                    </h4>
                    <p
                      className="mt-2 max-w-xl text-sm sm:text-base"
                      style={{ color: visual.textMuted }}
                    >
                      {safeHeadline}
                    </p>
                    {safeLocation ? (
                      <p className="mt-2 text-sm" style={{ color: visual.textSubtle }}>
                        {safeLocation}
                      </p>
                    ) : null}
                    <div
                      className="mt-4 inline-flex rounded-none border px-3 py-1 text-xs"
                      style={{
                        background: visual.surface,
                        borderColor: visual.border,
                        color: visual.accentBright,
                      }}
                    >
                      @{slug}
                    </div>
                  </div>

                  {resumeData.avatar_url ? (
                    <img
                      src={resumeData.avatar_url}
                      alt={safeName}
                      crossOrigin="anonymous"
                      className="h-20 w-20 shrink-0 rounded-none border-2 object-cover shadow-[0_0_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
                      style={{ borderColor: visual.accent }}
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-none font-heading text-3xl font-bold shadow-[0_0_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
                      style={{
                        background: `linear-gradient(135deg, ${visual.accent}, ${visual.accentBright})`,
                        color: visual.background,
                      }}
                    >
                      {initial}
                    </div>
                  )}
                </div>

                {shareTags.length ? (
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {shareTags.map((tag) => (
                      <span
                        key={tag}
                        className="max-w-full rounded-none border px-3 py-1 text-xs leading-5 whitespace-normal break-words"
                        style={{
                          background: visual.surface,
                          borderColor: visual.border,
                          color: visual.textMuted,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div
                  className="relative mt-5 grid gap-4 rounded-none border p-4 sm:grid-cols-[1fr_156px] sm:items-center"
                  style={{ background: visual.surfaceStrong, borderColor: visual.border }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: visual.text }}>
                      Scan to visit {firstName}&rsquo;s living page
                    </p>
                    <p className="mt-1 text-xs" style={{ color: visual.textSubtle }}>
                      This QR code is unique to @{slug} and opens {displayUrl}.
                    </p>
                  </div>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${displayUrl}`}
                      className="h-32 w-32 rounded-none border bg-white p-2 justify-self-start sm:h-[156px] sm:w-[156px] sm:justify-self-end"
                      style={{ borderColor: visual.border }}
                    />
                  ) : (
                    <div
                      className="h-32 w-32 rounded-none border sm:h-[156px] sm:w-[156px] sm:justify-self-end"
                      style={{ background: visual.surface, borderColor: visual.border }}
                    />
                  )}
                </div>

                <p
                  className="relative mt-4 font-mono text-xs"
                  style={{ color: visual.textSubtle }}
                >
                  {displayUrl}
                </p>
              </div>

              <div className="site-panel flex flex-col justify-between gap-4 p-5">
                <div>
                  <p className="site-eyebrow">Share actions</p>
                  <h4 className="site-panel-title mt-3 text-xl">
                    Send people straight to {firstName}
                  </h4>
                  <p className="site-muted mt-2 text-sm leading-6">
                    Download the branded PNG, copy the tracked page URL, or let someone scan the QR code on this card.
                  </p>
                </div>

                <div className="border border-site-border bg-site-canvas-alt p-4">
                  <p className="text-xs font-semibold text-site-muted">Tracked URL</p>
                  <p className="mt-2 break-all font-mono text-sm text-site-text">{livePageUrl}</p>
                </div>

                {shareFeedback ? (
                  <div className="site-callout p-4" role="status">
                    <p className="site-eyebrow">Proof ready</p>
                    <p className="mt-2 font-semibold text-site-text">{shareFeedback.title}</p>
                    <p className="site-muted mt-2 text-sm leading-6">
                      {shareFeedback.body}
                    </p>
                    <a
                      href={resolvedAnalyticsHref}
                      className="site-button site-button-secondary mt-4 px-4 py-2 text-xs"
                    >
                      {analyticsCtaLabel}
                    </a>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="site-button site-button-primary w-full"
                  >
                    {copied ? "Link copied" : "Copy Tracked Page Link"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="site-button site-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? "Downloading..." : "Download PNG Share Card"}
                  </button>
                  <a
                    href={livePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenLivePage}
                    className="site-button site-button-secondary w-full text-center"
                  >
                    Open Tracked Live Page
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`site-button site-button-secondary ${className ?? ""}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <span>Share {firstName}</span>
      </button>
    </>
  );
}
