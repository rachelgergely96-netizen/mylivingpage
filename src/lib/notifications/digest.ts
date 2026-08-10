import { parseReferrerLabel } from "@/lib/analytics/pageAnalytics";
import type { DigestPageSummary } from "@/lib/notifications/templates";

export const DIGEST_RANGE_DAYS = 7;
export const DIGEST_RANGE_LABEL = "last 7 days";

/** Minimum gap between digests, so a retried or re-triggered cron can't double-send. */
export const DIGEST_MIN_INTERVAL_DAYS = 6;

export interface DigestViewRow {
  viewer_ip: string | null;
  referrer: string | null;
  had_outbound_click: boolean | null;
}

export function buildDigestSummary(input: {
  pageUrl: string;
  views: DigestViewRow[];
}): DigestPageSummary {
  const viewsByIp = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  let outboundClicks = 0;

  for (const row of input.views) {
    if (row.viewer_ip) {
      viewsByIp.set(row.viewer_ip, (viewsByIp.get(row.viewer_ip) ?? 0) + 1);
    }
    if (row.had_outbound_click) {
      outboundClicks += 1;
    }

    const label = parseReferrerLabel(row.referrer);
    referrerCounts.set(label, (referrerCounts.get(label) ?? 0) + 1);
  }

  let repeatVisitors = 0;
  for (const count of viewsByIp.values()) {
    if (count > 1) {
      repeatVisitors += 1;
    }
  }

  // "Direct" is the default bucket rather than a source worth reporting; only
  // name a top referrer when a real one outranks it.
  const rankedReferrers = Array.from(referrerCounts.entries())
    .filter(([label]) => label !== "Direct" && label !== "Unknown")
    .sort((left, right) => right[1] - left[1]);

  return {
    pageUrl: input.pageUrl,
    views: input.views.length,
    repeatVisitors,
    topReferrerLabel: rankedReferrers[0]?.[0] ?? null,
    outboundClicks,
  };
}

export function digestWindowStart(now: Date): Date {
  return new Date(now.getTime() - DIGEST_RANGE_DAYS * 24 * 60 * 60 * 1000);
}

export function digestEligibilityCutoff(now: Date): Date {
  return new Date(now.getTime() - DIGEST_MIN_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
}
