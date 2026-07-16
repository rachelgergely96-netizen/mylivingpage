"use client";

import { useEffect, useRef, useState } from "react";
import { ShareCardArtwork } from "@/components/ShareCardArtwork";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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
  pageUserId: string;
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

export default function ShareCardDownload({
  pageId,
  pageUserId,
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [appUrl, setAppUrl] = useState(() => normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL));
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === pageUserId) setIsOwner(true);
    };
    check();
  }, [pageUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppUrl(normalizeAppUrl(window.location.origin));
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const triggerButton = triggerButtonRef.current;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleDialogKeys);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleDialogKeys);
      document.body.style.overflow = previousOverflow;
      triggerButton?.focus();
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
      setShareError("The share card is not ready yet. Please close this window and try again.");
      return;
    }

    setDownloading(true);
    setShareError(null);
    try {
      void trackShareIntent("page.share.download_card");
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#07111C",
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}-share-card.png`;
      a.click();
      showProofFeedback("Tracked share card downloaded");
    } catch {
      setShareError("Unable to download the PNG right now. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    setShareError(null);
    try {
      await navigator.clipboard.writeText(livePageUrl);
      void trackShareIntent("page.share.copy_link");
      setCopied(true);
      showProofFeedback("Tracked page link copied");
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
      setShareError("Unable to copy the link. You can select the tracked URL above instead.");
    }
  };

  const handleOpenLivePage = () => {
    setShareError(null);
    void trackShareIntent("page.share.open_live_page");
    showProofFeedback("Tracked live page opened");
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-dialog-title"
            className="profile-window my-auto max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto sm:max-h-[calc(100dvh-2rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(191,219,254,0.26)] bg-[linear-gradient(90deg,rgba(29,78,216,0.92),rgba(37,99,235,0.68))] px-5 py-3 sm:px-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#DBEAFE]">Share Card</p>
                <h3 id="share-card-dialog-title" className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF]">{safeName}</h3>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.55)]">
                  Unique QR code and downloadable card for @{slug}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-black/10 text-[rgba(240,244,255,0.72)] transition-colors hover:bg-black/20 hover:text-white"
                aria-label="Close share card"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_320px]">
              <ShareCardArtwork
                ref={cardRef}
                avatarUrl={resumeData.avatar_url}
                displayUrl={displayUrl}
                eyebrow="Personalized Share Card"
                headline={safeHeadline}
                location={safeLocation || undefined}
                name={safeName}
                qrAlt={`QR code for ${displayUrl}`}
                qrDataUrl={qrDataUrl}
                slug={slug}
                tags={shareTags}
                visual={visual}
              />

              <div className="profile-panel flex flex-col justify-between gap-4 p-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#3B82F6]">Share Actions</p>
                  <h4 className="mt-3 font-heading text-xl font-bold text-[#F0F4FF]">
                    Send people straight to {firstName}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                    Download the branded PNG, copy the tracked page URL, or let someone scan the QR code on this card.
                  </p>
                </div>

                <div className="border border-[rgba(147,197,253,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Tracked URL</p>
                  <p className="mt-2 break-all text-sm text-[#F0F4FF]">{livePageUrl}</p>
                </div>

                {shareError ? (
                  <p
                    role="alert"
                    aria-live="assertive"
                    className="border border-[rgba(255,142,142,0.24)] bg-[rgba(255,120,120,0.08)] p-3 text-sm leading-6 text-[#ffb4b4]"
                  >
                    {shareError}
                  </p>
                ) : null}

                {shareFeedback ? (
                  <div className="border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.1)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#93C5FD]">Proof ready</p>
                    <p className="mt-2 font-semibold text-[#F0F4FF]">{shareFeedback.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                      {shareFeedback.body}
                    </p>
                    <a
                      href={resolvedAnalyticsHref}
                      className="profile-action mt-4 px-4 py-2 text-xs uppercase tracking-[0.1em]"
                    >
                      {analyticsCtaLabel}
                    </a>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="profile-action px-4 py-3 text-sm"
                  >
                    {copied ? "Link copied" : "Copy Tracked Page Link"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="profile-action px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? "Downloading..." : "Download PNG Share Card"}
                  </button>
                  <a
                    href={livePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenLivePage}
                    className="profile-action px-4 py-3 text-center text-sm"
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
        ref={triggerButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`profile-action flex items-center gap-2 px-4 py-2.5 text-[13px] sm:text-sm ${className ?? ""}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <span>Share {firstName}</span>
      </button>
    </>
  );
}
