"use client";

import { useEffect, useRef, useState } from "react";
import { ScaledShareCardArtwork } from "@/components/ScaledShareCardArtwork";
import { ShareCardArtwork } from "@/components/ShareCardArtwork";
import TiltCard from "@/components/marketing/TiltCard";
import type { ShareIntentEventName } from "@/lib/analytics/proofSummary";
import { getShareCardFinish } from "@/lib/share-card-finish";
import {
  buildShareCardModel,
  getShareCardVisual,
  normalizeAppUrl,
  SHARE_CARD_SIZE,
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

async function prepareCardImages(node: HTMLElement): Promise<void> {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }
      await image.decode().catch(() => undefined);
    }),
  );
}

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
  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [appUrl, setAppUrl] = useState(() =>
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL),
  );
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
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
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
  const shareCardTreatment = getShareCardFinish("holographic", visual);
  const cardModel = buildShareCardModel({
    appUrl,
    liveUrl,
    resume: resumeData,
    slug,
  });
  const { firstName, livePageUrl, name: safeName } = cardModel;
  const resolvedAnalyticsHref =
    analyticsHref ?? `/dashboard/analytics/${pageId}`;

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
      body: "When someone opens your page, Analytics records the visit so you can see that your link was used.",
    });
  };

  const handleDownload = async () => {
    const exportNode =
      exportCardRef.current?.querySelector<HTMLElement>(
        "[data-share-card-artwork]",
      ) ?? null;
    if (!exportNode) {
      return;
    }

    setDownloadError(null);
    setDownloading(true);
    try {
      void trackShareIntent("page.share.download_card");
      await prepareCardImages(exportNode);
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportNode, {
        backgroundColor: shareCardTreatment.outerBackground,
        cacheBust: true,
        canvasHeight: SHARE_CARD_SIZE.height,
        canvasWidth: SHARE_CARD_SIZE.width,
        height: SHARE_CARD_SIZE.height,
        pixelRatio: 1,
        style: {
          margin: "0",
          position: "relative",
          transform: "none",
        },
        width: SHARE_CARD_SIZE.width,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}-share-card.png`;
      a.click();
      showProofFeedback("Share card downloaded");
    } catch {
      setDownloadError(
        "We couldn't create the PNG. Check the profile photo connection and try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    setDownloadError(null);
    try {
      await navigator.clipboard.writeText(livePageUrl);
      void trackShareIntent("page.share.copy_link");
      setCopied(true);
      showProofFeedback("Page link copied");
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
      setDownloadError(
        "We couldn't copy the link automatically. Select the page link above and copy it manually.",
      );
    }
  };

  const handleOpenLivePage = () => {
    void trackShareIntent("page.share.open_live_page");
    showProofFeedback("Live page opened");
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-site-canvas p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          data-share-card-backdrop="static"
          data-site-ui
        >
          <div
            ref={dialogRef}
            className="site-panel-raised min-h-dvh w-full max-w-6xl overflow-y-auto sm:min-h-0 sm:max-h-[calc(100dvh-2rem)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-dialog-title"
            tabIndex={-1}
          >
            <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-site-border bg-site-surface-raised px-4 py-3 sm:static sm:gap-4 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="site-eyebrow">Share Card</p>
                <h3
                  id="share-card-dialog-title"
                  className="site-panel-title mt-1 truncate sm:mt-2"
                >
                  {safeName}
                </h3>
                <p className="site-muted mt-1 truncate text-xs sm:text-sm">
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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div
              ref={exportCardRef}
              aria-hidden="true"
              data-share-card-export
              style={{
                height: SHARE_CARD_SIZE.height,
                left: -20000,
                pointerEvents: "none",
                position: "fixed",
                top: 0,
                width: SHARE_CARD_SIZE.width,
                zIndex: -1,
              }}
            >
              <ShareCardArtwork
                finish="holographic"
                model={cardModel}
                visual={visual}
              />
            </div>

            <div className="grid gap-4 p-3 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div
                data-living-output
                data-share-card-preview-stage
                data-theme-id={visual.themeId}
                data-theme-detail={visual.contentProfile}
                data-theme-collection={visual.collection}
                className="min-w-0 self-start overflow-visible border border-site-border p-2 sm:p-3"
                style={{ background: shareCardTreatment.outerBackground }}
              >
                <TiltCard
                  lift={14}
                  max={5}
                  targetSelector="[data-share-card-panel]"
                >
                  <ScaledShareCardArtwork
                    animatedShine
                    finish="holographic"
                    model={cardModel}
                    visual={visual}
                  />
                </TiltCard>
              </div>

              <div className="site-panel flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5">
                <div>
                  <p className="site-eyebrow">Share actions</p>
                  <h4 className="site-panel-title mt-3 text-xl">
                    Choose how to share {firstName}&rsquo;s page
                  </h4>
                  <p className="site-muted mt-2 text-sm leading-6">
                    Download the themed card, copy the page link, or preview the
                    live page before you send it.
                  </p>
                </div>

                <div className="border border-site-border bg-site-canvas-alt p-4">
                  <p className="text-xs font-semibold text-site-muted">
                    Page link
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-site-text">
                    {livePageUrl}
                  </p>
                </div>

                {downloadError ? (
                  <div className="site-callout p-4" role="alert">
                    <p className="site-eyebrow">Sharing needs another try</p>
                    <p className="site-muted mt-2 text-sm leading-6">
                      {downloadError}
                    </p>
                  </div>
                ) : null}

                {shareFeedback ? (
                  <div className="site-callout p-4" role="status">
                    <p className="site-eyebrow">Ready to share</p>
                    <p className="mt-2 font-semibold text-site-text">
                      {shareFeedback.title}
                    </p>
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
                    onClick={handleDownload}
                    disabled={downloading}
                    className="site-button site-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? "Creating PNG..." : "Download share card"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="site-button site-button-secondary w-full"
                  >
                    {copied ? "Link copied" : "Copy page link"}
                  </button>
                  <a
                    href={livePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenLivePage}
                    className="site-button site-button-secondary w-full text-center"
                  >
                    Preview live page
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
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
        <span>Share {firstName}&rsquo;s page</span>
      </button>
    </>
  );
}
