"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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
  pageUserId: string;
  slug: string;
  themeId: string;
  resumeData: ResumeData;
  premium?: boolean;
}

export default function ShareCardDownload({
  pageUserId,
  slug,
  themeId,
  resumeData,
  premium = false,
}: ShareCardDownloadProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [appUrl, setAppUrl] = useState(() => normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL));

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
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (!isOwner) return null;
  if (!premium) return null;

  const visual = getShareCardVisual(themeId);
  const safeName = truncate(resumeData.name || "MyLivingPage User", 40);
  const safeHeadline = truncate(resumeData.headline || "Professional profile", 78);
  const safeLocation = truncate(resumeData.location || "", 40);
  const firstName = getFirstName(safeName);
  const shareTags = getShareCardTags(resumeData);
  const livePageUrl = toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, slug), 42);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const initial = safeName.slice(0, 1).toUpperCase() || "?";

  const handleDownload = async () => {
    if (!cardRef.current) {
      return;
    }

    setDownloading(true);
    try {
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
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(livePageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[rgba(6,14,28,0.95)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#3B82F6]">Share Card</p>
                <h3 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF]">{safeName}</h3>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.55)]">
                  Unique QR code and downloadable card for @{slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[rgba(240,244,255,0.5)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
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
                className="relative overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.1)] p-5 sm:p-6"
                style={{
                  background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 60px ${visual.glow}`,
                }}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
                  style={{ background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)` }}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[rgba(240,244,255,0.56)]">
                      <span className="inline-block h-px w-5 rounded-full" style={{ background: visual.accent }} />
                      Personalized Share Card
                    </div>
                    <h4 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#F0F4FF] sm:text-4xl">
                      {safeName}
                    </h4>
                    <p className="mt-2 max-w-xl text-sm text-[rgba(240,244,255,0.82)] sm:text-base">{safeHeadline}</p>
                    {safeLocation ? (
                      <p className="mt-2 text-sm text-[rgba(240,244,255,0.56)]">{safeLocation}</p>
                    ) : null}
                    <div className="mt-4 inline-flex rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(10,22,40,0.38)] px-3 py-1 text-xs text-[#93C5FD]">
                      @{slug}
                    </div>
                  </div>

                  {resumeData.avatar_url ? (
                    <img
                      src={resumeData.avatar_url}
                      alt={safeName}
                      crossOrigin="anonymous"
                      className="h-20 w-20 shrink-0 rounded-full border-2 object-cover shadow-[0_0_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
                      style={{ borderColor: visual.accent }}
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-heading text-3xl font-bold text-[#0A1628] shadow-[0_0_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
                      style={{ background: `linear-gradient(135deg, ${visual.accent}, #E2E8F0)` }}
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
                        className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.4)] px-3 py-1 text-xs text-[rgba(240,244,255,0.78)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="relative mt-5 grid gap-4 rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[rgba(6,14,28,0.54)] p-4 sm:grid-cols-[1fr_156px] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[#F0F4FF]">Scan to visit {firstName}&rsquo;s living page</p>
                    <p className="mt-1 text-xs text-[rgba(240,244,255,0.56)]">
                      This QR code is unique to @{slug} and opens {displayUrl}.
                    </p>
                  </div>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${displayUrl}`}
                      className="h-32 w-32 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-white p-2 justify-self-start sm:h-[156px] sm:w-[156px] sm:justify-self-end"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] sm:h-[156px] sm:w-[156px] sm:justify-self-end" />
                  )}
                </div>

                <p className="relative mt-4 font-mono text-xs text-[rgba(240,244,255,0.56)]">{displayUrl}</p>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] p-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#3B82F6]">Share Actions</p>
                  <h4 className="mt-3 font-heading text-xl font-bold text-[#F0F4FF]">
                    Send people straight to {firstName}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                    Download the branded PNG, copy the direct page URL, or let someone scan the QR code on this card.
                  </p>
                </div>

                <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Direct URL</p>
                  <p className="mt-2 break-all text-sm text-[#F0F4FF]">{livePageUrl}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-xl border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm font-medium text-[#93C5FD] transition-colors hover:bg-[rgba(59,130,246,0.18)]"
                  >
                    {copied ? "Link copied" : "Copy Page Link"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-[rgba(240,244,255,0.78)] transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? "Downloading..." : "Download PNG Share Card"}
                  </button>
                  <a
                    href={livePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-[rgba(255,255,255,0.08)] px-4 py-3 text-center text-sm font-medium text-[rgba(240,244,255,0.7)] transition-colors hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                  >
                    Open Live Page
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-20 right-5 z-40 sm:bottom-5 sm:right-48">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] sm:text-sm text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <span>Share {firstName}</span>
        </button>
      </div>
    </>
  );
}
