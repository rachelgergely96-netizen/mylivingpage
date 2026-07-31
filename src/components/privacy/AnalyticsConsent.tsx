"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  isAnalyticsEligiblePath,
  isMyLivingPageAnalyticsHost,
  OPEN_COOKIE_SETTINGS_EVENT,
  parseAnalyticsConsent,
  type AnalyticsConsentChoice,
} from "@/lib/privacy/analytics-consent";

const GOOGLE_ANALYTICS_ID = "G-H46XPWEWEC";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __mylivingpageGaInitialized?: boolean;
  }
}

function updateGoogleConsent(choice: AnalyticsConsentChoice) {
  window.gtag?.("consent", "update", {
    analytics_storage: choice === "analytics" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export default function AnalyticsConsent() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [eligibleHost, setEligibleHost] = useState(false);
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const eligible = eligibleHost && isAnalyticsEligiblePath(pathname);
  const analyticsActive = hydrated && eligible && choice === "analytics";

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, []);

  useEffect(() => {
    let storedChoice: AnalyticsConsentChoice | null = null;
    try {
      storedChoice = parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
    } catch {
      // Storage can be unavailable in hardened browser modes; consent remains unset.
    }
    setChoice(storedChoice);
    setEligibleHost(isMyLivingPageAnalyticsHost(window.location.hostname));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen, closeSettings]);

  useEffect(() => {
    if (!analyticsActive) {
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  }, [analyticsActive]);

  useEffect(() => {
    if (!analyticsActive || !analyticsReady || !window.gtag) return;

    updateGoogleConsent("analytics");
    window.gtag("event", "page_view", {
      send_to: GOOGLE_ANALYTICS_ID,
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: "MyLivingPage",
    });
  }, [analyticsActive, analyticsReady, pathname]);

  const initializeAnalytics = useCallback(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));

    if (!window.__mylivingpageGaInitialized) {
      window.gtag("js", new Date());
      window.gtag("config", GOOGLE_ANALYTICS_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        anonymize_ip: true,
        cookie_flags: "SameSite=Lax;Secure",
      });
      window.__mylivingpageGaInitialized = true;
    }

    setAnalyticsReady(true);
  }, []);

  const saveChoice = (nextChoice: AnalyticsConsentChoice) => {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextChoice);
    } catch {
      // The in-memory choice still applies for this page if storage is blocked.
    }
    setChoice(nextChoice);
    closeSettings();
    updateGoogleConsent(nextChoice);
  };

  const showPrompt = hydrated && (settingsOpen || (eligible && choice === null));

  return (
    <>
      {analyticsActive ? (
        <Script
          id="mylivingpage-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="afterInteractive"
          onLoad={initializeAnalytics}
          onReady={initializeAnalytics}
        />
      ) : null}

      {showPrompt ? (
        <section
          ref={panelRef}
          tabIndex={-1}
          role={settingsOpen ? "dialog" : undefined}
          aria-modal={settingsOpen ? false : undefined}
          aria-label="Cookie and analytics settings"
          className="fixed inset-x-5 bottom-5 z-[100] border border-site-border bg-site-surface p-4 shadow-[var(--site-shadow-overlay)] sm:left-auto sm:max-w-xl sm:p-5"
          data-site-ui
        >
          <div className="flex items-center justify-between gap-3">
            <p className="site-eyebrow">Your privacy choice</p>
            {settingsOpen ? (
              <button
                type="button"
                aria-label="Close cookie settings"
                className="site-icon-button -mr-2 -mt-2 shrink-0"
                onClick={closeSettings}
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-site-text">Optional, minimized analytics</h2>
          <p className="mt-2 text-sm leading-6 text-site-secondary">
            With your permission, Google Analytics measures visits on our marketing and policy
            pages. It never runs on people&apos;s professional pages, and we omit query strings and
            personal page titles. Essential authentication storage works either way. Read our{" "}
            <Link href="/cookies" className="font-semibold text-site-action underline underline-offset-2">
              Cookie Policy
            </Link>.
          </p>
          {choice !== null ? (
            <p className="mt-3 text-sm leading-6 text-site-secondary">
              Current setting:{" "}
              <span className="font-semibold text-site-text">
                {choice === "analytics" ? "analytics allowed" : "essential only"}
              </span>
              .
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              aria-pressed={choice === "essential"}
              className={`site-button site-button-secondary ${
                choice === "essential"
                  ? "border-site-border-strong bg-site-surface-selected text-site-text"
                  : ""
              }`}
              onClick={() => saveChoice("essential")}
            >
              Essential only
            </button>
            <button
              type="button"
              aria-pressed={choice === "analytics"}
              className={`site-button site-button-secondary ${
                choice === "analytics"
                  ? "border-site-border-strong bg-site-surface-selected text-site-text"
                  : ""
              }`}
              onClick={() => saveChoice("analytics")}
            >
              Allow analytics
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
