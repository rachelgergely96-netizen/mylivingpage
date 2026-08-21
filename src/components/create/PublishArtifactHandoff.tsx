"use client";

import React, {
  type AnimationEvent as ReactAnimationEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScaledShareCardArtwork } from "@/components/ScaledShareCardArtwork";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { MOTION_EVENTS, type MotionMode } from "@/lib/motion";
import {
  buildShareCardModel,
  getShareCardVisual,
  normalizeAppUrl,
} from "@/lib/share-card";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

export const PUBLISH_ARTIFACT_FALLBACK_MS = 900;

const PUBLISH_ARTIFACT_KEYFRAMES = `
  @keyframes mlp-publish-artifact-full {
    from { opacity: 0.72; transform: translate3d(-12px, 0, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes mlp-publish-artifact-calm {
    from { opacity: 0.72; }
    to { opacity: 1; }
  }
`;

export interface PublishArtifactMotion {
  animationName: string | null;
  durationMs: number;
  opacityOnly: boolean;
}

export function getPublishArtifactMotion(mode: MotionMode): PublishArtifactMotion {
  if (mode === "still") {
    return { animationName: null, durationMs: 0, opacityOnly: true };
  }
  if (mode === "calm") {
    return { animationName: "mlp-publish-artifact-calm", durationMs: 160, opacityOnly: true };
  }
  return { animationName: "mlp-publish-artifact-full", durationMs: 380, opacityOnly: false };
}

type PublishHandoffPhase = "handoff" | "artifact-ready";

interface PublishArtifactHandoffProps {
  confirmed: boolean;
  resumeData: ResumeData;
  sequence: number;
  slug: string;
  themeId: ThemeId;
}

export default function PublishArtifactHandoff({
  confirmed,
  resumeData,
  sequence,
  slug,
  themeId,
}: PublishArtifactHandoffProps) {
  const { mode } = useMotionPreference();
  const [phase, setPhase] = useState<PublishHandoffPhase>(() =>
    mode === "still" ? "artifact-ready" : "handoff",
  );
  const finishedRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);
  const handledSequenceRef = useRef<number | null>(null);
  const motion = getPublishArtifactMotion(mode);
  const model = useMemo(
    () =>
      buildShareCardModel({
        appUrl: normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL),
        resume: resumeData,
        slug,
      }),
    [resumeData, slug],
  );
  const visual = useMemo(() => getShareCardVisual(themeId), [themeId]);

  const finishHandoff = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setPhase("artifact-ready");
  }, []);

  useEffect(() => {
    if (!confirmed) {
      handledSequenceRef.current = null;
      finishedRef.current = false;
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setPhase("handoff");
      return;
    }
    if (handledSequenceRef.current === sequence) {
      return;
    }

    handledSequenceRef.current = sequence;
    finishedRef.current = false;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    setPhase("handoff");
    fallbackTimerRef.current = window.setTimeout(
      finishHandoff,
      PUBLISH_ARTIFACT_FALLBACK_MS,
    );

    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (!finishedRef.current && handledSequenceRef.current === sequence) {
        handledSequenceRef.current = null;
      }
    };
  }, [confirmed, finishHandoff, sequence]);

  useEffect(() => {
    if (
      confirmed &&
      mode === "still" &&
      handledSequenceRef.current === sequence
    ) {
      finishHandoff();
    }
  }, [confirmed, finishHandoff, mode, sequence]);

  const handleAnimationEnd = (event: ReactAnimationEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target && phase === "handoff") {
      finishHandoff();
    }
  };

  if (!confirmed) {
    return null;
  }

  const animation =
    phase === "handoff" && motion.animationName
      ? `${motion.animationName} ${motion.durationMs}ms cubic-bezier(.16,1,.3,1) both`
      : undefined;

  return (
    <section
      aria-labelledby="publish-artifact-handoff-title"
      data-publish-artifact-handoff
      data-motion-event={MOTION_EVENTS.PAGE_PUBLISH_CONFIRMED}
      data-motion-signal="share-handoff"
      data-motion-state="publish-confirmed"
      data-motion-sequence={sequence}
      data-motion-target="page"
      className="site-panel overflow-hidden p-5 sm:p-6"
    >
      <p className="sr-only" role="status" aria-live="polite">
        Publish confirmed. Your page is live and the share card is available.
      </p>
      <style>{PUBLISH_ARTIFACT_KEYFRAMES}</style>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(14rem,0.72fr)_minmax(0,1.28fr)] lg:items-center">
        <div className="min-w-0">
          <p className="site-eyebrow text-site-success">Publish confirmed</p>
          <h3 id="publish-artifact-handoff-title" className="site-panel-title mt-2">
            Your page is ready to hand off
          </h3>
          <p className="mt-2 text-sm leading-6 text-site-secondary">
            The saved page and this share card point to the same live professional story.
          </p>
          <p className="mt-4 border-l-2 border-site-action pl-3 text-xs leading-5 text-site-secondary">
            <span className="font-semibold text-site-text">Share artifact</span>
            <span className="ml-2">
              Ready to share.
            </span>
          </p>
        </div>

        <div
          onAnimationEnd={handleAnimationEnd}
          data-motion-event={
            phase === "artifact-ready" ? MOTION_EVENTS.SHARE_ARTIFACT_READY : undefined
          }
          data-motion-signal={phase === "artifact-ready" ? "share-handoff" : undefined}
          data-motion-state={phase === "artifact-ready" ? "ready" : undefined}
          data-motion-sequence={phase === "artifact-ready" ? sequence : undefined}
          data-motion-target={phase === "artifact-ready" ? "share-card" : undefined}
          className="min-w-0 border border-site-border-strong bg-black p-2 shadow-[var(--site-shadow-raised)] sm:p-3"
          style={{ animation }}
        >
          <ScaledShareCardArtwork
            ctaHeadline="Open the live professional page"
            frameClassName="w-full"
            model={model}
            visual={visual}
          />
        </div>
      </div>
    </section>
  );
}
