export const ANALYTICS_CONSENT_STORAGE_KEY = "mylivingpage.analytics-consent.v1";
export const OPEN_COOKIE_SETTINGS_EVENT = "mylivingpage:open-cookie-settings";

export type AnalyticsConsentChoice = "analytics" | "essential";

const ANALYTICS_EXACT_PATHS = new Set([
  "/",
  "/pricing",
  "/examples",
  "/guides",
  "/legal",
  "/terms",
  "/privacy",
  "/cookies",
  "/acceptable-use",
  "/dmca",
  "/disclaimer",
  "/security",
  "/delete-account",
]);

/**
 * Analytics is deliberately limited to brand-owned marketing, guidance, and
 * policy pages. A public /:username page is therefore never eligible.
 */
export function isAnalyticsEligiblePath(pathname: string): boolean {
  return ANALYTICS_EXACT_PATHS.has(pathname) || pathname.startsWith("/guides/");
}

export function isMyLivingPageAnalyticsHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return (
    normalized === "mylivingpage.com" ||
    normalized === "www.mylivingpage.com"
  );
}

export function parseAnalyticsConsent(value: string | null): AnalyticsConsentChoice | null {
  return value === "analytics" || value === "essential" ? value : null;
}
