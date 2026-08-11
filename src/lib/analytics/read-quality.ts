/**
 * Separates a view someone actually read from one that merely loaded.
 *
 * `/api/pages/view` already excludes signed-in owners and dedupes to one row per
 * hashed IP per page per 24h, and `ViewTracker` only runs where JavaScript runs
 * — so plain crawlers and the common link-preview fetchers never reach here.
 *
 * What still reaches here is the headless link scanner: Defender Safe Links,
 * Proofpoint URL Defense, corporate mail gateways. They execute JS, then leave.
 * They do not dwell, scroll, or click. Counting those as reads would tell a job
 * seeker their application was opened when it was only scanned in transit, so
 * dwell is the discriminator — already collected by the engagement beacon.
 */

export const READ_ENGAGED_SECONDS = 10;
export const READ_SCROLL_DEPTH_PCT = 25;

/**
 * Scroll depth alone proves nothing. `ViewTracker.updateScrollDepth` computes
 * `(scrollTop + clientHeight) / scrollHeight`, so a page whose content fits the
 * viewport reports 100% on load, before anyone has done anything — which is
 * exactly the shape a scanner produces. Depth therefore only counts alongside a
 * floor of real dwell.
 */
export const READ_SCROLL_MIN_SECONDS = 4;

export interface ReadQualitySignals {
  engagedSeconds: number | null | undefined;
  maxScrollDepthPct: number | null | undefined;
  hadOutboundClick: boolean | null | undefined;
}

export function looksLikeRealRead(signals: ReadQualitySignals): boolean {
  // An outbound click is the strongest signal in the product — someone reaching
  // for the email or LinkedIn link is unambiguously a person — so it qualifies
  // on its own, without waiting for the dwell threshold.
  if (signals.hadOutboundClick) {
    return true;
  }

  const engagedSeconds = signals.engagedSeconds ?? 0;
  if (engagedSeconds >= READ_ENGAGED_SECONDS) {
    return true;
  }

  const scrollDepth = signals.maxScrollDepthPct ?? 0;
  return (
    scrollDepth > READ_SCROLL_DEPTH_PCT &&
    engagedSeconds >= READ_SCROLL_MIN_SECONDS
  );
}

/** Human phrasing for the activity list, e.g. "40 seconds, mostly on Proof". */
export function describeViewQuality(
  signals: ReadQualitySignals & { primarySectionLabel?: string | null },
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
