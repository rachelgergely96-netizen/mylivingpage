"use client";

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import DashboardPagePreview from "@/components/dashboard/DashboardPagePreview";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { resolveMotionDuration } from "@/lib/motion";
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
  "--welcome-reveal-duration": string;
};

type WelcomePhase = "entering" | "holding" | "revealing";

const HOLD_DURATION_MS = 4200;

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
  const { mode: motionMode } = useMotionPreference();
  const entryDurationMs = resolveMotionDuration("context", motionMode);
  const revealDurationMs = resolveMotionDuration("context", motionMode);
  const holdDurationMs = motionMode === "full" ? HOLD_DURATION_MS : 0;
  const [visible, setVisible] = useState(Boolean(snapshot));
  const [phase, setPhase] = useState<WelcomePhase>("entering");
  const [userPaused, setUserPaused] = useState(false);
  const [visibilityPaused, setVisibilityPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const phaseRef = useRef<WelcomePhase>("entering");
  const holdRemainingRef = useRef(HOLD_DURATION_MS);
  const holdStartedAtRef = useRef(0);
  const paused = motionMode === "full" && (userPaused || visibilityPaused);

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
    const updateVisibility = () => setVisibilityPaused(document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!snapshot || !visible || motionMode === "still" || phase !== "entering") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        holdRemainingRef.current = holdDurationMs;
        moveToPhase("holding");
      },
      entryDurationMs,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [entryDurationMs, holdDurationMs, motionMode, moveToPhase, phase, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible || phase !== "holding" || paused) {
      return;
    }

    holdStartedAtRef.current = performance.now();
    const timer = window.setTimeout(revealDashboard, motionMode === "full" ? holdRemainingRef.current : 0);

    return () => {
      window.clearTimeout(timer);
      if (motionMode === "full" && phaseRef.current === "holding") {
        const elapsed = performance.now() - holdStartedAtRef.current;
        holdRemainingRef.current = Math.max(
          0,
          holdRemainingRef.current - elapsed,
        );
      }
    };
  }, [motionMode, paused, phase, revealDashboard, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible || motionMode === "still" || phase !== "revealing") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setVisible(false);
        window.requestAnimationFrame(() => {
          document.getElementById("main-content")?.focus();
        });
      },
      revealDurationMs,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [motionMode, phase, revealDurationMs, snapshot, visible]);

  useEffect(() => {
    if (!snapshot || !visible || motionMode === "still") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const dashboardMain = document.getElementById("main-content");
    const previousMainInert = dashboardMain?.inert ?? false;
    const previousMainAriaHidden = dashboardMain
      ? dashboardMain.getAttribute("aria-hidden")
      : null;
    document.body.style.overflow = "hidden";
    if (dashboardMain) {
      dashboardMain.inert = true;
      dashboardMain.setAttribute("aria-hidden", "true");
    }
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
      if (dashboardMain) {
        dashboardMain.inert = previousMainInert;
        if (previousMainAriaHidden === null) {
          dashboardMain.removeAttribute("aria-hidden");
        } else {
          dashboardMain.setAttribute("aria-hidden", previousMainAriaHidden);
        }
      }
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [motionMode, revealDashboard, snapshot, visible]);

  if (!snapshot || !visible) {
    return null;
  }

  const copy = getWelcomeCopy(snapshot);
  const status = snapshot.publicViewAvailable
    ? "Live"
    : snapshot.offlineAttemptAt
      ? "Offline"
      : "Private draft";
  const eyebrow = snapshot.publicViewAvailable
    ? "Welcome back · page reconnected"
    : snapshot.offlineAttemptAt
      ? "Welcome back · page offline"
      : "Welcome back · draft saved";
  const welcomeStyle: WelcomeStyle = {
    "--welcome-accent": snapshot.accent,
    "--welcome-accent-bright": snapshot.accentBright,
    "--welcome-accent-soft": snapshot.accentSoft,
    "--welcome-hold-duration": `${holdDurationMs}ms`,
    "--welcome-reveal-duration": `${revealDurationMs}ms`,
  };

  if (motionMode === "still") {
    return (
      <section
        aria-describedby="dashboard-welcome-description"
        aria-labelledby="dashboard-welcome-title"
        className={styles.inlineRoot}
        data-dashboard-welcome
        data-motion-mode="still"
        data-state="inline"
        role="status"
        style={welcomeStyle}
      >
        <div className={styles.inlineCopy}>
          <p className={styles.inlineEyebrow}>{eyebrow}</p>
          <h2 id="dashboard-welcome-title" className={styles.inlineTitle}>
            {copy.title}
          </h2>
          <p id="dashboard-welcome-description" className={styles.inlineBody}>
            {copy.body}
          </p>
        </div>
        <dl className={styles.inlineSignals}>
          <div>
            <dt>Page status</dt>
            <dd>
              <span
                className={
                  snapshot.publicViewAvailable
                    ? styles.inlineStatusDot
                    : `${styles.inlineStatusDot} ${styles.statusDotMuted}`
                }
                aria-hidden="true"
              />
              {status}
            </dd>
          </div>
          <div>
            <dt>Current link</dt>
            <dd>{snapshot.livePath}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{snapshot.themeName}</dd>
          </div>
        </dl>
        <button
          type="button"
          className={styles.inlineDismiss}
          onClick={() => setVisible(false)}
        >
          Dismiss summary
        </button>
      </section>
    );
  }
  const handoffStatus =
    phase === "entering"
      ? "Bringing your page into view…"
      : phase === "revealing"
        ? "Opening your dashboard"
        : paused
          ? "Automatic opening paused"
          : "Page ready. Dashboard opens automatically…";

  return (
    <div
      ref={dialogRef}
      aria-describedby="dashboard-welcome-description"
      aria-labelledby="dashboard-welcome-title"
      aria-modal="true"
      className={styles.root}
      data-dashboard-welcome
      data-motion-mode={motionMode}
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
            {motionMode === "full" ? (
              <button
                type="button"
                aria-pressed={userPaused}
                className={styles.pause}
                onClick={() => setUserPaused((isPaused) => !isPaused)}
              >
                {userPaused ? "Resume intro" : "Pause intro"}
              </button>
            ) : null}
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
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id="dashboard-welcome-title" className={styles.title}>
              {copy.title}
            </h2>
            <p id="dashboard-welcome-description" className={styles.body}>
              {copy.body}
            </p>

            <div className={styles.signalRail}>
              <div className={styles.signalCell}>
                <p className={styles.signalLabel}>Page status</p>
                <p className={styles.signalValue}>
                  <span
                    className={
                      snapshot.publicViewAvailable
                        ? styles.statusDot
                        : `${styles.statusDot} ${styles.statusDotMuted}`
                    }
                    aria-hidden="true"
                  />
                  <span>{status}</span>
                </p>
              </div>
              <div className={styles.signalCell}>
                <p className={styles.signalLabel}>Current link</p>
                <p className={styles.signalValue}>
                  <span className={styles.signalPath}>{snapshot.livePath}</span>
                </p>
              </div>
            </div>

            <div className={styles.handoff}>
              <div className={styles.handoffMeta}>
                <span>Opening your workspace</span>
                <span aria-live="polite" aria-atomic="true">
                  {handoffStatus}
                </span>
              </div>
              <div
                className={styles.handoffTrack}
                role="progressbar"
                aria-label="Opening your dashboard"
                aria-valuemin={0}
                aria-valuemax={100}
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
                Open dashboard now
              </button>
              <span className={styles.escapeHint}>
                No click needed
                <span className={styles.escapeHintKey}> · Esc skips</span>
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
