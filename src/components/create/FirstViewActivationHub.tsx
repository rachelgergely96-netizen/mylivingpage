"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { MOTION_MODE_POLICIES } from "@/lib/motion";
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
  const { mode: motionMode } = useMotionPreference();
  const allowsSmoothScroll =
    MOTION_MODE_POLICIES[motionMode].allowsSmoothScroll;
  const [selectedScenario, setSelectedScenario] =
    useState<ShareScenario>("application_follow_up");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariantId ?? variants[0]?.id ?? null,
  );
  const [loopState, setLoopState] =
    useState<FirstViewLoopState>("repeat_share_prompt");
  const [proof, setProof] = useState<PageProofResponse | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "message" | "link" | "error">("idle");
  const [checkingProof, setCheckingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "",
  );
  const sharePanelRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
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
      setCopyState(mode === "message_template" ? "message" : "link");
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
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopyState((current) => (current === "error" ? current : "idle"));
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
    sharePanelRef.current?.scrollIntoView({
      behavior: allowsSmoothScroll ? "smooth" : "auto",
      block: "start",
    });
    sharePanelRef.current?.focus({ preventScroll: true });
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
    : "Start the proof loop";
  const repeatShareBody = proof?.firstViewAfterLatestShareAt
    ? `Someone looked after your last share${proof?.lastShareVariantLabel ? ` of "${proof.lastShareVariantLabel}"` : ""}. Keep the momentum going by sending the same page to one more person.`
    : "Pick one real follow-up moment in the send panel below, copy the message, and send it now. You'll see here when someone looks.";
  const firstViewRelative = formatRelativeTime(proof?.firstViewAfterLatestShareAt ?? null);
  const firstViewDuration = formatDuration(
    proof?.firstViewAfterLatestShareEngagedSeconds ?? null,
  );
  const lastShareScenarioLabel = getShareScenarioLabel(proof?.lastShareScenario ?? null);

  return (
    <div className="space-y-5">
      <section
        className="site-panel-raised p-5 sm:p-6"
        aria-live="polite"
        aria-busy={checkingProof}
      >
        <p className="site-eyebrow">
          Proof
        </p>

        {loopState === "waiting_for_first_view" ? (
          <>
            <h3 className="site-panel-title mt-2">
              Waiting for someone to look
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
              Send this now. You&apos;ll know when they open it. After you send the copied
              message, come back here and see if someone looked.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void checkForViews()}
                disabled={checkingProof}
                className="site-button site-button-secondary min-w-48 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingProof ? "Checking for views…" : "See if someone looked"}
              </button>
              <button
                type="button"
                onClick={focusSharePanel}
                className="site-button site-button-secondary"
              >
                Copy another message
              </button>
            </div>
          </>
        ) : loopState === "first_view_detected" ? (
          <>
            <h3 className="site-panel-title mt-2">
              Someone looked at your page
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
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
                <span className="site-badge">
                  Viewed on {proof.firstViewAfterLatestShareDeviceLabel}
                </span>
              ) : null}
              <span className="site-badge">
                {firstViewDuration
                  ? `Read for about ${firstViewDuration}`
                  : "Reading time will appear after they finish browsing"}
              </span>
              {proof?.bestScenarioLast7d ? (
                <span className="site-badge">
                  Best scenario so far: {getShareScenarioLabel(proof.bestScenarioLast7d)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={focusSharePanel}
                className="site-button site-button-secondary"
              >
                Share again
              </button>
              <Link
                href={analyticsHref}
                className="site-button site-button-secondary"
              >
                {analyticsCtaLabel}
              </Link>
              <Link
                href={previewSharePath}
                onClick={handleOpenLivePage}
                className="site-button site-button-secondary"
              >
                Open your page
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 className="site-panel-title mt-2">
              {repeatShareHeadline}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
              {repeatShareBody}
            </p>
          </>
        )}

        {proofError ? (
          <p role="alert" className="site-alert-danger mt-4 px-4 py-3 text-sm">
            {proofError}
          </p>
        ) : null}
      </section>

      {loopState === "waiting_for_first_view" ? (
        <section className="site-panel p-5 sm:p-6">
          <p className="site-eyebrow">
            Test the loop
          </p>
          <h3 className="site-panel-title mt-2">
            Want to test it once?
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
            Open the link from another logged-out device or ask one trusted contact to open it
            once. Opening it from this same logged-in owner session will not count.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={previewSharePath}
              onClick={handleOpenLivePage}
              className="site-button site-button-secondary"
            >
              Open your page
            </Link>
            <button
              type="button"
              onClick={() => void checkForViews()}
              disabled={checkingProof}
              className="site-button site-button-secondary min-w-48 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingProof ? "Checking for views…" : "See if someone looked"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        ref={sharePanelRef}
        tabIndex={-1}
        className="site-panel scroll-mt-24 p-5 outline-none sm:p-6"
      >
        <p className="site-eyebrow">
          Send it now
        </p>
        <h3 className="site-panel-title mt-2">
          Who will you send this to?
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
          Choose one real follow-up moment. The fastest path is good enough, sent quickly.
        </p>

        {variants.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-site-secondary">
              Targeted version
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedVariantId(null)}
                className={`site-button ${
                  selectedVariantId === null
                    ? "border-site-action bg-site-selected text-site-text"
                    : "site-button-secondary"
                }`}
                aria-pressed={selectedVariantId === null}
              >
                Base page
              </button>
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`site-button ${
                    selectedVariantId === variant.id
                      ? "border-site-action bg-site-selected text-site-text"
                      : "site-button-secondary"
                  }`}
                  aria-pressed={selectedVariantId === variant.id}
                >
                  {variant.label.trim() || "Untitled version"}
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
                className={`site-button ${
                  active
                    ? "border-site-action bg-site-selected text-site-text"
                    : "site-button-secondary"
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border border-site-border bg-site-canvas-alt p-4">
          <p className="site-eyebrow text-site-muted">
            Copy and send this
          </p>
          <p className="mt-2 text-sm leading-6 text-site-secondary">
            {
              SHARE_SCENARIO_OPTIONS.find((option) => option.id === selectedScenario)
                ?.description
            }
          </p>
          {selectedVariant ? (
            <p className="mt-2 text-sm text-site-action">
              This link will open the &quot;{selectedVariant.label.trim() || "Untitled version"}&quot; version first.
            </p>
          ) : null}
          <div className="mt-4 border border-site-border-strong bg-site-canvas p-4 text-sm leading-7 text-site-text">
            {message}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleTrackedCopy("message_template")}
              className="site-button site-button-primary"
            >
              {copyState === "message" ? "Message copied" : "Copy message"}
            </button>
            <button
              type="button"
              onClick={() => void handleTrackedCopy("link_only")}
              className="site-button site-button-secondary"
            >
              {copyState === "link" ? "Link copied" : "Copy your link"}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-site-secondary">
            Send this now. You&apos;ll know when they open it.
          </p>
          {copyState === "error" ? (
            <p role="alert" className="mt-3 text-sm text-site-danger">
              Could not copy. Try again or copy the live URL manually.
            </p>
          ) : null}
          {copyState === "message" || copyState === "link" ? (
            <p role="status" className="sr-only">
              {copyState === "message" ? "Message copied to clipboard." : "Link copied to clipboard."}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
