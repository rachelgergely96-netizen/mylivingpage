"use client";

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import DashboardPagePreview from "@/components/dashboard/DashboardPagePreview";
import type { PageProofStatus } from "@/lib/analytics/proofSummary";
import type { ResumeData } from "@/types/resume";
import styles from "./DashboardWelcomeBack.module.css";

export interface DashboardWelcomeBackSnapshot {
  accent: string;
  accentBright: string;
  accentSoft: string;
  displayName: string | null;
  livePath: string;
  offlineAttemptAt: string | null;
  pageName: string;
  proofStatus: PageProofStatus;
  publicViewAvailable: boolean;
  resumeData: ResumeData;
  themeId: string;
  themeName: string;
  viewsLast7d: number;
}

interface DashboardWelcomeBackProps {
  snapshot: DashboardWelcomeBackSnapshot | null;
}

type WelcomeStyle = CSSProperties & {
  "--welcome-accent": string;
  "--welcome-accent-bright": string;
  "--welcome-accent-soft": string;
  "--welcome-hold-duration": string;
};

type WelcomePhase = "entering" | "holding" | "revealing";

const ENTRY_DURATION_MS = 900;
const HOLD_DURATION_MS = 2300;
const REDUCED_HOLD_DURATION_MS = 1400;
const REVEAL_DURATION_MS = 480;

function firstName(displayName: string | null): string | null {
  return displayName?.trim().split(/\s+/)[0] || null;
}

function getWelcomeCopy(snapshot: DashboardWelcomeBackSnapshot) {
  const name = firstName(snapshot.displayName);

  if (!snapshot.publicViewAvailable) {
    if (snapshot.offlineAttemptAt) {
      return {
        body: "Someone tried your public link while it was offline. Your dashboard has the fastest path to bring it back.",
        title: name
          ? `${name}, your page is ready to come back online.`
          : "Your page is ready to come back online.",
      };
    }

    return {
      body: "Your private draft is exactly where you left it—ready for the next edit, theme, or publish.",
      title: name
        ? `${name}, your page is ready when you are.`
        : "Your page is ready when you are.",
    };
  }

  const body =
    snapshot.proofStatus === "proof_landed"
      ? "Someone viewed it after your last share. Your recent activity is waiting inside."
      : snapshot.proofStatus === "active"
        ? `${snapshot.viewsLast7d} view${snapshot.viewsLast7d === 1 ? "" : "s"} in the last 7 days. Your page kept showing up while you were away.`
        : snapshot.proofStatus === "awaiting_views"
          ? "Your link is live and waiting for its first view."
          : `Live at ${snapshot.livePath} and ready for your next move.`;

  return {
    body,
    title: name
      ? `${name}, your page kept living.`
      : "Your Living Page kept living.",
  };
}

function consumeWelcomeIntent() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("welcome") !== "1") {
    return;
  }

  url.searchParams.delete("welcome");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function DashboardWelcomeBack({ snapshot }: DashboardWelcomeBackProps) {
  const [visible, setVisible] = useState(Boolean(snapshot));
  const [phase, setPhase] = useState<WelcomePhase>("entering");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visibilityPaused, setVisibilityPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const phaseRef = useRef<WelcomePhase>("entering");
  const holdRemainingRef = useRef(HOLD_DURATION_MS);
  const holdStartedAtRef = useRef(0);
  const paused = userPaused || visibilityPaused;

  const moveToPhase = useCallback((nextPhase: WelcomePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const revealDashboard = useCallback(() => {
    if (phaseRef.current === "revealing") {
      return;
    }

    moveToPhase("revealing");
  }, [moveToPhase]);

  useEffect(() => {
    consumeWelcomeIntent();
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);

    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => setVisibilityPaused(document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!snapshot || !visible || phase !== "entering") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        holdRemainingRef.current = reducedMotion
          ? REDUCED_HOLD_DURATION_MS
          : HOLD_DURATION_MS;
        moveToPhase("holding");
      },
      reducedMotion ? 0 : ENTRY_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [moveToPhase, phase, reducedMotion, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible || phase !== "holding" || paused) {
      return;
    }

    holdStartedAtRef.current = performance.now();
    const timer = window.setTimeout(revealDashboard, holdRemainingRef.current);

    return () => {
      window.clearTimeout(timer);
      if (phaseRef.current === "holding") {
        const elapsed = performance.now() - holdStartedAtRef.current;
        holdRemainingRef.current = Math.max(
          0,
          holdRemainingRef.current - elapsed,
        );
      }
    };
  }, [paused, phase, revealDashboard, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible || phase !== "revealing") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setVisible(false);
        window.requestAnimationFrame(() => {
          document.getElementById("main-content")?.focus();
        });
      },
      reducedMotion ? 0 : REVEAL_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, reducedMotion, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      continueRef.current?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        revealDashboard();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [revealDashboard, snapshot, visible]);

  if (!snapshot || !visible) {
    return null;
  }

  const copy = getWelcomeCopy(snapshot);
  const status = snapshot.publicViewAvailable
    ? "Live"
    : snapshot.offlineAttemptAt
      ? "Offline"
      : "Private draft";
  const welcomeStyle: WelcomeStyle = {
    "--welcome-accent": snapshot.accent,
    "--welcome-accent-bright": snapshot.accentBright,
    "--welcome-accent-soft": snapshot.accentSoft,
    "--welcome-hold-duration": `${
      reducedMotion ? REDUCED_HOLD_DURATION_MS : HOLD_DURATION_MS
    }ms`,
  };
  const handoffStatus =
    phase === "entering"
      ? "Reconnecting to your page…"
      : phase === "revealing"
        ? "Opening your dashboard"
        : paused
          ? "Handoff paused"
          : "Signal locked. Opening your dashboard…";

  return (
    <div
      ref={dialogRef}
      aria-describedby="dashboard-welcome-description"
      aria-labelledby="dashboard-welcome-title"
      aria-modal="true"
      className={styles.root}
      data-dashboard-welcome
      data-paused={paused ? "true" : "false"}
      data-state={phase}
      role="dialog"
      style={welcomeStyle}
    >
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <span className={styles.wordmark} aria-hidden="true">
            my<span>living</span>page
          </span>
          <div className={styles.topbarActions}>
            <button
              type="button"
              aria-pressed={userPaused}
              className={styles.pause}
              onClick={() => setUserPaused((isPaused) => !isPaused)}
            >
              {userPaused ? "Resume intro" : "Pause intro"}
            </button>
            <button
              type="button"
              className={styles.skip}
              onClick={revealDashboard}
            >
              Skip intro
            </button>
          </div>
        </div>

        <section className={styles.stage}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Signal reconnected</p>
            <h2 id="dashboard-welcome-title" className={styles.title}>
              {copy.title}
            </h2>
            <p id="dashboard-welcome-description" className={styles.body}>
              {copy.body}
            </p>

            <div className={styles.signalRail}>
              <div className={styles.signalCell}>
                <p className={styles.signalLabel}>Status</p>
                <p className={styles.signalValue}>
                  <span className={styles.statusDot} aria-hidden="true" />
                  <span>{status}</span>
                </p>
              </div>
              <div className={styles.signalCell}>
                <p className={styles.signalLabel}>Your public path</p>
                <p className={styles.signalValue}>
                  <span>{snapshot.livePath}</span>
                </p>
              </div>
            </div>

            <div className={styles.handoff}>
              <div className={styles.handoffMeta}>
                <span>Dashboard handoff</span>
                <span aria-live="polite" aria-atomic="true">
                  {handoffStatus}
                </span>
              </div>
              <div
                className={styles.handoffTrack}
                role="progressbar"
                aria-label="Opening your dashboard"
                aria-valuetext={handoffStatus}
              >
                <span className={styles.handoffFill} />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                ref={continueRef}
                type="button"
                className={styles.continue}
                onClick={revealDashboard}
              >
                Enter dashboard now
              </button>
              <span className={styles.escapeHint}>
                Opens automatically · Esc skips
              </span>
            </div>
          </div>

          <div className={styles.visual}>
            <div className={styles.visualLabel}>
              <span>Your Living Page</span>
              <span>{status}</span>
            </div>
            <div className={styles.preview} data-dashboard-welcome-preview>
              <DashboardPagePreview
                height={360}
                resumeData={snapshot.resumeData}
                themeId={snapshot.themeId}
              />
            </div>
            <div className={styles.pageIdentity}>
              <p className={styles.pageName}>{snapshot.pageName}</p>
              <p className={styles.pageTheme}>{snapshot.themeName} theme</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
