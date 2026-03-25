"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FirstViewLoopState,
  PageProofResponse,
  ShareIntentEventName,
  ShareScenario,
} from "@/lib/analytics/proofSummary";
import {
  buildShareScenarioMessage,
  buildTrackedSharePath,
  createShareLinkId,
  getShareScenarioLabel,
  SHARE_SCENARIO_OPTIONS,
} from "@/lib/create-share";
import type { PageVariant } from "@/types/resume";

interface FirstViewActivationHubProps {
  pageId: string;
  livePath: string;
  analyticsHref: string;
  analyticsCtaLabel?: string;
  variants?: PageVariant[];
  defaultVariantId?: string | null;
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return null;
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (!minutes) {
    return `${remainder}s`;
  }

  if (!remainder) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

export default function FirstViewActivationHub({
  pageId,
  livePath,
  analyticsHref,
  analyticsCtaLabel = "Open page analytics",
  variants = [],
  defaultVariantId = null,
}: FirstViewActivationHubProps) {
  const [selectedScenario, setSelectedScenario] =
    useState<ShareScenario>("application_follow_up");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariantId ?? variants[0]?.id ?? null,
  );
  const [loopState, setLoopState] =
    useState<FirstViewLoopState>("repeat_share_prompt");
  const [proof, setProof] = useState<PageProofResponse | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [checkingProof, setCheckingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "",
  );
  const sharePanelRef = useRef<HTMLDivElement | null>(null);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const previewSharePath = useMemo(
    () => buildTrackedSharePath(livePath, selectedScenario, { variant: selectedVariant }),
    [livePath, selectedScenario, selectedVariant],
  );
  const previewShareUrl = useMemo(
    () => (appOrigin ? `${appOrigin}${previewSharePath}` : previewSharePath),
    [appOrigin, previewSharePath],
  );
  const message = useMemo(
    () => buildShareScenarioMessage(selectedScenario, previewShareUrl, selectedVariant),
    [selectedScenario, previewShareUrl, selectedVariant],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setAppOrigin(window.location.origin.replace(/\/$/, ""));
  }, []);

  const trackShareIntent = async (
    eventName: ShareIntentEventName,
    metadata: Record<string, unknown>,
  ) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventName,
          metadata,
        }),
        keepalive: true,
      });
    } catch {
      // Tracking should never block the activation loop.
    }
  };

  const handleTrackedCopy = async (mode: "message_template" | "link_only") => {
    const shareLinkId = createShareLinkId();
    const trackedSharePath = buildTrackedSharePath(livePath, selectedScenario, {
      variant: selectedVariant,
      shareLinkId,
    });
    const trackedShareUrl = appOrigin
      ? `${appOrigin}${trackedSharePath}`
      : trackedSharePath;
    const value =
      mode === "message_template"
        ? buildShareScenarioMessage(selectedScenario, trackedShareUrl, selectedVariant)
        : trackedShareUrl;

    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      setProofError(null);
      setLoopState("waiting_for_first_view");
      void trackShareIntent("page.share.copy_link", {
        page_id: pageId,
        scenario: selectedScenario,
        surface: "create_success",
        mode,
        variant_id: selectedVariant?.id ?? null,
        variant_label: selectedVariant?.label ?? null,
        share_link_id: shareLinkId,
        share_path: trackedSharePath,
      });
      window.setTimeout(() => {
        setCopyState((current) => (current === "copied" ? "idle" : current));
      }, 2400);
    } catch {
      setCopyState("error");
    }
  };

  const checkForViews = async () => {
    setCheckingProof(true);
    setProofError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/proof`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | PageProofResponse
        | { error?: string }
        | null;

      if (
        !response.ok ||
        !payload ||
        ("error" in payload && typeof payload.error === "string") ||
        !("loopState" in payload)
      ) {
        const message =
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not see if someone looked right now.";
        throw new Error(message);
      }

      setProof(payload);
      setLoopState(payload.loopState);
    } catch (error) {
      setProofError(
        error instanceof Error
          ? error.message
          : "Could not see if someone looked right now.",
      );
    } finally {
      setCheckingProof(false);
    }
  };

  const focusSharePanel = () => {
    setLoopState("repeat_share_prompt");
    sharePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenLivePage = () => {
    void trackShareIntent("page.share.open_live_page", {
      page_id: pageId,
      scenario: selectedScenario,
      surface: "create_success",
      mode: "activation_hub",
      variant_id: selectedVariant?.id ?? null,
      variant_label: selectedVariant?.label ?? null,
      share_path: previewSharePath,
    });
  };

  const repeatShareHeadline = proof?.firstViewAfterLatestShareAt
    ? "That worked. Send it again."
    : "Who will you send this to?";
  const repeatShareBody = proof?.firstViewAfterLatestShareAt
    ? `Someone looked after your last share${proof?.lastShareVariantLabel ? ` of "${proof.lastShareVariantLabel}"` : ""}. Keep the momentum going by sending the same page to one more person.`
    : "Pick one real follow-up moment, copy the message, and send it now so the proof loop can start.";
  const firstViewRelative = formatRelativeTime(proof?.firstViewAfterLatestShareAt ?? null);
  const firstViewDuration = formatDuration(
    proof?.firstViewAfterLatestShareEngagedSeconds ?? null,
  );
  const lastShareScenarioLabel = getShareScenarioLabel(proof?.lastShareScenario ?? null);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
          Proof
        </p>

        {loopState === "waiting_for_first_view" ? (
          <>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
              Waiting for someone to look
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.72)]">
              Send this now. You&apos;ll know when they open it. After you send the copied
              message, come back here and see if someone looked.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void checkForViews()}
                disabled={checkingProof}
                className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingProof ? "Checking..." : "See if someone looked"}
              </button>
              <button
                type="button"
                onClick={focusSharePanel}
                className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                Copy another message
              </button>
            </div>
          </>
        ) : loopState === "first_view_detected" ? (
          <>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
              Someone looked at your page.
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.72)]">
              {firstViewRelative
                ? `The first look after your recent share happened ${firstViewRelative}.`
                : "The first look after your recent share has landed."}{" "}
              {lastShareScenarioLabel ? `This came after you used "${lastShareScenarioLabel}."` : ""}
              {proof?.lastShareVariantLabel
                ? ` The version they saw was "${proof.lastShareVariantLabel}."`
                : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {proof?.firstViewAfterLatestShareDeviceLabel ? (
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(240,244,255,0.76)]">
                  Viewed on {proof.firstViewAfterLatestShareDeviceLabel}
                </span>
              ) : null}
              <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(240,244,255,0.76)]">
                {firstViewDuration
                  ? `Read for about ${firstViewDuration}`
                  : "Reading time will appear after they finish browsing"}
              </span>
              {proof?.bestScenarioLast7d ? (
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(240,244,255,0.76)]">
                  Best scenario so far: {getShareScenarioLabel(proof.bestScenarioLast7d)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={focusSharePanel}
                className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
              >
                Share again
              </button>
              <Link
                href={analyticsHref}
                className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                {analyticsCtaLabel}
              </Link>
              <Link
                href={previewSharePath}
                onClick={handleOpenLivePage}
                className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                Open your page
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
              {repeatShareHeadline}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.72)]">
              {repeatShareBody}
            </p>
          </>
        )}

        {proofError ? (
          <p className="mt-4 rounded-xl border border-[rgba(255,120,120,0.28)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#FFD5D5]">
            {proofError}
          </p>
        ) : null}
      </section>

      {loopState === "waiting_for_first_view" ? (
        <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">
            Test the loop
          </p>
          <h3 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
            Want to test it once?
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.62)]">
            Open the link from another logged-out device or ask one trusted contact to open it
            once. Opening it from this same logged-in owner session will not count.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={previewSharePath}
              onClick={handleOpenLivePage}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Open your page
            </Link>
            <button
              type="button"
              onClick={() => void checkForViews()}
              disabled={checkingProof}
              className="rounded-full border border-[rgba(59,130,246,0.35)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingProof ? "Checking..." : "See if someone looked"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        ref={sharePanelRef}
        className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 sm:p-6"
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">
          Send it now
        </p>
        <h3 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
          Who will you send this to?
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.62)]">
          Choose one real follow-up moment. The fastest path is good enough, sent quickly.
        </p>

        {variants.length > 0 ? (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
              Targeted version
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedVariantId(null)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  selectedVariantId === null
                    ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                    : "border-[rgba(255,255,255,0.14)] text-[rgba(240,244,255,0.68)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                }`}
              >
                Base page
              </button>
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    selectedVariantId === variant.id
                      ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                      : "border-[rgba(255,255,255,0.14)] text-[rgba(240,244,255,0.68)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                  }`}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {SHARE_SCENARIO_OPTIONS.map((option) => {
            const active = option.id === selectedScenario;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedScenario(option.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                    : "border-[rgba(255,255,255,0.14)] text-[rgba(240,244,255,0.68)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
            Copy and send this
          </p>
          <p className="text-sm leading-6 text-[rgba(240,244,255,0.62)]">
            {
              SHARE_SCENARIO_OPTIONS.find((option) => option.id === selectedScenario)
                ?.description
            }
          </p>
          {selectedVariant ? (
            <p className="mt-2 text-sm text-[#93C5FD]">
              This link will open the &quot;{selectedVariant.label}&quot; version first.
            </p>
          ) : null}
          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(8,16,28,0.72)] p-4 font-mono text-sm leading-7 text-[#F0F4FF]">
            {message}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleTrackedCopy("message_template")}
              className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              {copyState === "copied" ? "Message copied" : "Copy message"}
            </button>
            <button
              type="button"
              onClick={() => void handleTrackedCopy("link_only")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Copy your link
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
            Send this now. You&apos;ll know when they open it.
          </p>
          {copyState === "error" ? (
            <p className="mt-3 text-sm text-[#FFD5D5]">
              Could not copy that message. Try again or copy the live URL manually.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
