/**
 * A "qualified" view is one a human plausibly had.
 *
 * `/api/pages/view` already excludes signed-in owners and dedupes to one row per
 * hashed IP per page per 24h, and `ViewTracker` only runs where JavaScript runs
 * — so plain crawlers and the common link-preview fetchers never reach here.
 *
 * What still reaches here is the headless link scanner: Defender Safe Links,
 * Proofpoint URL Defense, corporate mail gateways. They execute JS, then leave.
 * They do not dwell, scroll, or click. So dwell is the discriminator, and it is
 * already collected by the engagement beacon — no new tracking required.
 */

export const QUALIFIED_VIEW_ENGAGED_SECONDS = 10;
export const QUALIFIED_VIEW_SCROLL_DEPTH_PCT = 25;

export interface QualifiedViewSignals {
  engagedSeconds: number | null | undefined;
  maxScrollDepthPct: number | null | undefined;
  hadOutboundClick: boolean | null | undefined;
}

export function isQualifiedView(signals: QualifiedViewSignals): boolean {
  // An outbound click is the strongest signal in the product — someone reaching
  // for the email or LinkedIn link is unambiguously a person — so it qualifies
  // on its own, without waiting for the dwell threshold.
  if (signals.hadOutboundClick) {
    return true;
  }

  const engagedSeconds = signals.engagedSeconds ?? 0;
  if (engagedSeconds >= QUALIFIED_VIEW_ENGAGED_SECONDS) {
    return true;
  }

  const scrollDepth = signals.maxScrollDepthPct ?? 0;
  return scrollDepth > QUALIFIED_VIEW_SCROLL_DEPTH_PCT;
}

/** Human phrasing for the notification body, e.g. "40 seconds, mostly on Proof". */
export function describeViewQuality(
  signals: QualifiedViewSignals & { primarySectionLabel?: string | null },
): string {
  const parts: string[] = [];
  const engagedSeconds = signals.engagedSeconds ?? 0;

  if (engagedSeconds > 0) {
    parts.push(
      engagedSeconds >= 60
        ? `${Math.round(engagedSeconds / 60)} min on the page`
        : `${engagedSeconds} seconds on the page`,
    );
  }

  if (signals.primarySectionLabel) {
    parts.push(`mostly on ${signals.primarySectionLabel}`);
  }

  if (signals.hadOutboundClick) {
    parts.push("and followed one of your links");
  }

  if (parts.length === 0) {
    return "They opened your page.";
  }

  return `They spent ${parts.join(", ")}.`;
}
