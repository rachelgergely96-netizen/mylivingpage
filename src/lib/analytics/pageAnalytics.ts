import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYTICS_RANGE_DAYS,
  ANALYTICS_SECTION_IDS,
  LOW_DATA_MIN_SAMPLE,
  type AnalyticsRangeKey,
  type AnalyticsSectionId,
  type AnalyticsTargetKey,
  isAnalyticsSectionId,
  isAnalyticsTargetKey,
} from "@/lib/analytics/constants";
import {
  formatAnalyticsSectionLabel,
  formatAnalyticsTargetLabel,
} from "@/lib/analytics/publicTracking";

export type AnalyticsComparisonStatus = "up" | "down" | "flat" | "new";
export type PageAnalyticsAvailability = "full" | "basic" | "unavailable";

export interface PageAnalyticsViewRow {
  id: string;
  viewed_at: string;
  referrer: string | null;
  user_agent: string | null;
  viewer_ip: string | null;
  country: string | null;
  engaged_seconds: number | null;
  max_scroll_depth_pct: number | null;
  primary_section: AnalyticsSectionId | null;
  had_outbound_click: boolean | null;
}

export interface PageAnalyticsInteractionRow {
  page_view_id: string;
  target_key: AnalyticsTargetKey;
  target_label: string | null;
  click_count: number | null;
}

export interface AnalyticsMetric {
  value: number;
  previousValue: number;
  deltaPercent: number | null;
  status: AnalyticsComparisonStatus;
  lowData: boolean;
}

export interface PageAnalyticsDashboardState {
  availability: PageAnalyticsAvailability;
  notice: string | null;
  hasTraffic: boolean;
  hasEngagement: boolean;
  lowData: boolean;
}

export interface PageAnalyticsDashboardData {
  rangeKey: AnalyticsRangeKey;
  rangeDays: number;
  rangeLabel: string;
  allTimeViews: number;
  state: PageAnalyticsDashboardState;
  overview: {
    views: AnalyticsMetric;
    uniqueVisitors: AnalyticsMetric;
    outboundCtr: AnalyticsMetric;
    avgEngagedTime: AnalyticsMetric;
  };
  trend: {
    dailyViews: Array<{
      date: string;
      label: string;
      count: number;
    }>;
    totalViews: number;
    comparison: AnalyticsMetric;
  };
  acquisition: {
    topReferrers: Array<{
      label: string;
      count: number;
      sharePct: number;
    }>;
    directSharePct: number;
  };
  audience: {
    devices: Array<{
      label: string;
      count: number;
      sharePct: number;
    }>;
    countries: Array<{
      label: string;
      count: number;
      sharePct: number;
    }>;
  };
  followUp: {
    repeatVisitors: number;
    recentViews: number;
    latestViewAt: string | null;
    latestReferrerLabel: string | null;
    repeatViewAlert: boolean;
    suggestedTimingLabel: string;
    suggestedTimingDetail: string;
    summary: string;
  };
  conversion: {
    clickedViews: number;
    totalClicks: number;
    topActions: Array<{
      targetKey: AnalyticsTargetKey;
      label: string;
      count: number;
    }>;
  };
  contentPerformance: {
    topSection: {
      id: AnalyticsSectionId;
      label: string;
      count: number;
      sharePct: number;
    } | null;
    sections: Array<{
      id: AnalyticsSectionId;
      label: string;
      count: number;
      sharePct: number;
    }>;
    scrollDepth: Array<{
      label: string;
      count: number;
      sharePct: number;
    }>;
    avgScrollDepthPct: number | null;
  };
  insights: string[];
}

interface BuildPageAnalyticsDashboardInput {
  rangeKey: AnalyticsRangeKey;
  allTimeViews: number;
  views: PageAnalyticsViewRow[];
  interactions: PageAnalyticsInteractionRow[];
  includeEngagementInsights?: boolean;
  now?: Date;
}

interface FetchPageAnalyticsDashboardInput {
  supabase: SupabaseClient;
  pageId: string;
  rangeKey: AnalyticsRangeKey;
  allTimeViews: number;
  now?: Date;
}

interface InteractionAggregate {
  targetKey: AnalyticsTargetKey;
  targetLabel: string | null;
  count: number;
}

interface AnalyticsQueryErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface CreateFallbackDashboardInput {
  rangeKey: AnalyticsRangeKey;
  allTimeViews: number;
  notice?: string | null;
  now?: Date;
}

const SCROLL_DEPTH_BUCKETS = [
  { label: "0-24%", min: 0, max: 24 },
  { label: "25-49%", min: 25, max: 49 },
  { label: "50-74%", min: 50, max: 74 },
  { label: "75-100%", min: 75, max: 100 },
] as const;

const FULL_VIEW_SELECT =
  "id, viewed_at, referrer, user_agent, viewer_ip, country, engaged_seconds, max_scroll_depth_pct, primary_section, had_outbound_click";
const BASIC_VIEW_SELECT = "id, viewed_at, referrer, user_agent, viewer_ip, country";
const BASIC_ANALYTICS_NOTICE =
  "Detailed reading and click insights are temporarily unavailable. Basic activity is still showing below, and the richer detail will come back automatically.";
// Matches the dashboard's fallback description so the unavailable card reads
// the same either way, and sticks to the surface's "activity"/"details"
// vocabulary instead of "analytics" jargon.
const UNAVAILABLE_ANALYTICS_NOTICE =
  "Traffic data could not be loaded right now. Please try again soon.";
const MIN_SAMPLE_FOR_PERCENT_INSIGHTS = 3;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0s";
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

function roundPct(value: number) {
  return Math.round(value * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function coerceBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return null;
}

function sanitizeViewRows(rows: unknown, mode: "full" | "basic"): PageAnalyticsViewRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const id = coerceText(row.id);
    const viewedAt = coerceText(row.viewed_at);

    if (!id || !viewedAt) {
      return [];
    }

    const primarySection = coerceText(row.primary_section);

    return [
      {
        id,
        viewed_at: viewedAt,
        referrer: coerceText(row.referrer),
        user_agent: coerceText(row.user_agent),
        viewer_ip: coerceText(row.viewer_ip),
        country: coerceText(row.country),
        engaged_seconds: mode === "full" ? coerceNumber(row.engaged_seconds) : null,
        max_scroll_depth_pct: mode === "full" ? coerceNumber(row.max_scroll_depth_pct) : null,
        primary_section:
          mode === "full" && isAnalyticsSectionId(primarySection) ? primarySection : null,
        had_outbound_click: mode === "full" ? coerceBoolean(row.had_outbound_click) : false,
      },
    ];
  });
}

function sanitizeInteractionRows(rows: unknown): PageAnalyticsInteractionRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const pageViewId = coerceText(row.page_view_id);
    const targetKey = coerceText(row.target_key);

    if (!pageViewId || !isAnalyticsTargetKey(targetKey)) {
      return [];
    }

    return [
      {
        page_view_id: pageViewId,
        target_key: targetKey,
        target_label: coerceText(row.target_label),
        click_count: coerceNumber(row.click_count),
      },
    ];
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown analytics error";
}

function isRecoverableSchemaError(error: unknown) {
  if (!isRecord(error)) {
    return false;
  }

  const queryError = error as AnalyticsQueryErrorLike;
  const code = queryError.code?.toUpperCase();

  if (code === "42703" || code === "42P01" || code === "PGRST204" || code === "PGRST205") {
    return true;
  }

  const haystack = [queryError.message, queryError.details, queryError.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("undefined column") ||
    haystack.includes("undefined table") ||
    haystack.includes("schema cache") ||
    haystack.includes("relation \"page_interactions\" does not exist") ||
    haystack.includes("column \"engaged_seconds\" does not exist") ||
    haystack.includes("column engaged_seconds does not exist") ||
    haystack.includes("could not find the 'engaged_seconds' column") ||
    haystack.includes("could not find the table 'public.page_interactions'")
  );
}

function withAvailabilityState(
  dashboard: PageAnalyticsDashboardData,
  availability: PageAnalyticsAvailability,
  notice: string | null,
): PageAnalyticsDashboardData {
  return {
    ...dashboard,
    state: {
      ...dashboard.state,
      availability,
      notice,
    },
  };
}

function buildMetric(
  currentValue: number,
  previousValue: number,
  sampleSize = currentValue + previousValue,
  minSample = LOW_DATA_MIN_SAMPLE,
): AnalyticsMetric {
  const lowData = sampleSize < minSample;

  if (currentValue === previousValue) {
    return {
      value: currentValue,
      previousValue,
      deltaPercent: lowData ? null : 0,
      status: "flat",
      lowData,
    };
  }

  if (previousValue <= 0 && currentValue > 0) {
    return {
      value: currentValue,
      previousValue,
      deltaPercent: null,
      status: "new",
      lowData,
    };
  }

  const deltaPercent =
    previousValue > 0
      ? roundPct(((currentValue - previousValue) / previousValue) * 100)
      : null;

  return {
    value: currentValue,
    previousValue,
    deltaPercent: lowData ? null : deltaPercent,
    status: currentValue > previousValue ? "up" : "down",
    lowData,
  };
}

export function parseReferrerLabel(referrer: string | null) {
  if (!referrer) {
    return "Direct";
  }

  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}

function detectDeviceLabel(userAgent: string | null) {
  const normalized = userAgent ?? "";

  if (/Tablet|iPad/i.test(normalized)) {
    return "Tablet";
  }

  if (/Mobile|Android|iPhone/i.test(normalized)) {
    return "Mobile";
  }

  return "Desktop";
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toShareRows(
  counts: Map<string, number>,
  total: number,
  limit?: number,
) {
  const rows = Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      sharePct: total > 0 ? roundPct((count / total) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function buildDailyViews(currentRows: PageAnalyticsViewRow[], currentStart: Date, rangeDays: number) {
  const countByDay = new Map<string, number>();

  for (const row of currentRows) {
    const day = row.viewed_at.slice(0, 10);
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }

  return Array.from({ length: rangeDays }, (_, index) => {
    const day = addUtcDays(currentStart, index);
    const key = day.toISOString().slice(0, 10);

    return {
      date: key,
      label: formatShortDate(day),
      count: countByDay.get(key) ?? 0,
    };
  });
}

function buildScrollDepth(currentRows: PageAnalyticsViewRow[]) {
  const counts = new Map<string, number>();
  const percentages: number[] = [];

  for (const bucket of SCROLL_DEPTH_BUCKETS) {
    counts.set(bucket.label, 0);
  }

  for (const row of currentRows) {
    if (row.max_scroll_depth_pct === null || row.max_scroll_depth_pct === undefined) {
      continue;
    }

    const pct = Math.max(0, Math.min(100, row.max_scroll_depth_pct));
    percentages.push(pct);

    const bucket =
      SCROLL_DEPTH_BUCKETS.find((candidate) => pct >= candidate.min && pct <= candidate.max) ??
      SCROLL_DEPTH_BUCKETS[SCROLL_DEPTH_BUCKETS.length - 1];

    counts.set(bucket.label, (counts.get(bucket.label) ?? 0) + 1);
  }

  const total = percentages.length;

  return {
    rows: SCROLL_DEPTH_BUCKETS.map((bucket) => ({
      label: bucket.label,
      count: counts.get(bucket.label) ?? 0,
      sharePct: total > 0 ? roundPct(((counts.get(bucket.label) ?? 0) / total) * 100) : 0,
    })),
    avgScrollDepthPct: total > 0 ? average(percentages) : null,
  };
}

function buildInsights({
  currentRows,
  topReferrers,
  directSharePct,
  topActions,
  topSection,
  outboundCtr,
  avgEngagedTime,
  includeEngagementInsights,
}: {
  currentRows: PageAnalyticsViewRow[];
  topReferrers: Array<{ label: string; count: number; sharePct: number }>;
  directSharePct: number;
  topActions: Array<{ label: string; count: number }>;
  topSection: { label: string; sharePct: number } | null;
  outboundCtr: number;
  avgEngagedTime: number;
  includeEngagementInsights: boolean;
}) {
  if (!currentRows.length) {
    return [
      "No proof yet. Share your page in follow-up emails, messages, or your email signature to start seeing who actually reviewed it.",
    ];
  }

  const insights: string[] = [];
  const topReferrer = topReferrers[0] ?? null;
  const engagedSectionViews = currentRows.filter((row) => Boolean(row.primary_section)).length;

  if (topReferrer && topReferrer.label !== "Direct" && topReferrer.count >= 2) {
    insights.push(
      currentRows.length >= MIN_SAMPLE_FOR_PERCENT_INSIGHTS
        ? `Most people are finding this page through ${topReferrer.label} (${Math.round(topReferrer.sharePct)}% of reviews).`
        : `Most people are finding this page through ${topReferrer.label}.`,
    );
  } else if (directSharePct >= 50) {
    insights.push(
      "Most people are opening the page from direct shares right now, which usually means messages, saved notes, or your email signature are doing the work.",
    );
  }

  if (includeEngagementInsights) {
    if (topActions[0] && outboundCtr > 0) {
      insights.push(
        currentRows.length >= MIN_SAMPLE_FOR_PERCENT_INSIGHTS
          ? `${Math.round(outboundCtr)}% of people who reviewed the page clicked a next step, with ${topActions[0].label} getting the most action.`
          : `People are already clicking a next step, with ${topActions[0].label} getting the first action.`,
      );
    } else if (currentRows.length >= 3) {
      insights.push(
        "People are arriving, but no next-step clicks were recorded yet. Tightening the top of the page or highlighting one action may help.",
      );
    }

    if (topSection) {
      insights.push(
        engagedSectionViews >= MIN_SAMPLE_FOR_PERCENT_INSIGHTS
          ? `${topSection.label} is holding attention best so far (${Math.round(topSection.sharePct)}% of engaged views).`
          : `${topSection.label} is holding attention best in the first few engaged views. Early signal, small sample.`,
      );
    } else if (avgEngagedTime > 0) {
      insights.push(
        `People are spending about ${formatDuration(avgEngagedTime)} actually reading the page on average.`,
      );
    }
  }

  return insights.slice(0, 3);
}

function buildFollowUpSignals({
  currentRows,
  topReferrers,
  topSection,
  now,
}: {
  currentRows: PageAnalyticsViewRow[];
  topReferrers: Array<{ label: string; count: number; sharePct: number }>;
  topSection: { label: string; sharePct: number } | null;
  now: Date;
}) {
  if (!currentRows.length) {
    return {
      repeatVisitors: 0,
      recentViews: 0,
      latestViewAt: null,
      latestReferrerLabel: null,
      repeatViewAlert: false,
      suggestedTimingLabel: "Share the page once",
      suggestedTimingDetail:
        "Start with one real follow-up. Once someone opens the page, timing guidance will update here.",
      summary:
        "No outside traffic yet. The next best move is to send the tracked page in one recruiter reply, application follow-up, or referral intro.",
    };
  }

  const latestRow = [...currentRows].sort((left, right) =>
    right.viewed_at.localeCompare(left.viewed_at),
  )[0];
  const repeatVisitors = Array.from(
    currentRows.reduce((counts, row) => {
      const key = row.viewer_ip ?? `unknown:${row.id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()).values(),
  ).filter((count) => count > 1).length;
  const recentViews = currentRows.filter((row) => {
    const viewedAt = new Date(row.viewed_at).getTime();
    return now.getTime() - viewedAt <= 72 * 60 * 60 * 1000;
  }).length;
  const latestReferrerLabel = parseReferrerLabel(latestRow?.referrer ?? null);
  const latestViewAgeHours = latestRow
    ? Math.max(0, (now.getTime() - new Date(latestRow.viewed_at).getTime()) / (60 * 60 * 1000))
    : Number.POSITIVE_INFINITY;
  let suggestedTimingLabel = "Re-share with fresh context";
  let suggestedTimingDetail =
    "It has been a while since the latest look. Send the page again with a more specific reason to click.";

  if (repeatVisitors > 0 && latestViewAgeHours <= 24) {
    suggestedTimingLabel = "Follow up today";
    suggestedTimingDetail =
      "Someone has come back more than once recently. This is the strongest signal to send a direct follow-up now.";
  } else if (latestViewAgeHours <= 24) {
    suggestedTimingLabel = "Follow up tomorrow";
    suggestedTimingDetail =
      "The page was opened recently. Give them a little space, then send one crisp follow-up while you are still fresh in context.";
  } else if (recentViews > 0) {
    suggestedTimingLabel = "Nudge this week";
    suggestedTimingDetail =
      "There was interest in the last few days, but not today. A short nudge or a more targeted variant is the next best move.";
  }

  const topReferrer = topReferrers[0];
  const summary =
    repeatVisitors > 0
      ? `There ${repeatVisitors === 1 ? "is" : "are"} ${repeatVisitors} repeat ${repeatVisitors === 1 ? "viewer" : "viewers"} in this range. That usually means real interest, not a stray click.`
      : topReferrer && topReferrer.label !== "Direct"
        ? currentRows.length >= MIN_SAMPLE_FOR_PERCENT_INSIGHTS
          ? `${Math.round(topReferrer.sharePct)}% of current traffic is coming from ${topReferrer.label}, so that channel is earning the next follow-up.`
          : `Current traffic is coming from ${topReferrer.label}, so that channel is earning the next follow-up.`
        : topSection
          ? `${topSection.label} is holding attention best so far, which is a good clue for what to lead with in the next message.`
          : "Recent traffic is light, so keep the next follow-up simple and give the page a clearer reason to be opened.";

  return {
    repeatVisitors,
    recentViews,
    latestViewAt: latestRow?.viewed_at ?? null,
    latestReferrerLabel,
    repeatViewAlert: repeatVisitors > 0,
    suggestedTimingLabel,
    suggestedTimingDetail,
    summary,
  };
}

export function buildPageAnalyticsDashboard({
  rangeKey,
  allTimeViews,
  views,
  interactions,
  includeEngagementInsights = true,
  now = new Date(),
}: BuildPageAnalyticsDashboardInput): PageAnalyticsDashboardData {
  const rangeDays = ANALYTICS_RANGE_DAYS[rangeKey];
  const currentEnd = startOfUtcDay(addUtcDays(now, 1));
  const currentStart = startOfUtcDay(addUtcDays(currentEnd, -(rangeDays)));
  const previousStart = startOfUtcDay(addUtcDays(currentStart, -rangeDays));
  const rangeLabel = `Last ${rangeDays} days`;

  const currentRows = views.filter((row) => {
    const viewedAt = row.viewed_at;
    return viewedAt >= currentStart.toISOString() && viewedAt < currentEnd.toISOString();
  });
  const previousRows = views.filter((row) => {
    const viewedAt = row.viewed_at;
    return viewedAt >= previousStart.toISOString() && viewedAt < currentStart.toISOString();
  });

  const currentViewIds = new Set(currentRows.map((row) => row.id));
  const currentInteractions = interactions.filter((row) => currentViewIds.has(row.page_view_id));
  const currentUniqueVisitors = new Set(
    currentRows.map((row) => row.viewer_ip).filter((value): value is string => Boolean(value)),
  ).size;
  const previousUniqueVisitors = new Set(
    previousRows.map((row) => row.viewer_ip).filter((value): value is string => Boolean(value)),
  ).size;

  const currentClickedViews = currentRows.filter((row) => row.had_outbound_click).length;
  const previousClickedViews = previousRows.filter((row) => row.had_outbound_click).length;
  const currentOutboundCtr =
    currentRows.length > 0 ? roundPct((currentClickedViews / currentRows.length) * 100) : 0;
  const previousOutboundCtr =
    previousRows.length > 0 ? roundPct((previousClickedViews / previousRows.length) * 100) : 0;

  const currentEngagedSeconds = currentRows
    .map((row) => row.engaged_seconds ?? 0)
    .filter((value) => value > 0);
  const previousEngagedSeconds = previousRows
    .map((row) => row.engaged_seconds ?? 0)
    .filter((value) => value > 0);
  const currentAvgEngagedTime = average(currentEngagedSeconds);
  const previousAvgEngagedTime = average(previousEngagedSeconds);

  const referrerCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>([
    ["Desktop", 0],
    ["Mobile", 0],
    ["Tablet", 0],
  ]);
  const countryCounts = new Map<string, number>();
  const sectionCounts = new Map<AnalyticsSectionId, number>();
  const interactionCounts = new Map<string, InteractionAggregate>();

  for (const row of currentRows) {
    const referrer = parseReferrerLabel(row.referrer);
    referrerCounts.set(referrer, (referrerCounts.get(referrer) ?? 0) + 1);

    const device = detectDeviceLabel(row.user_agent);
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);

    const country = row.country?.trim() || "Unknown";
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);

    if (row.primary_section) {
      sectionCounts.set(row.primary_section, (sectionCounts.get(row.primary_section) ?? 0) + 1);
    }
  }

  for (const interaction of currentInteractions) {
    const count = Math.max(1, interaction.click_count ?? 1);
    const key = `${interaction.target_key}::${interaction.target_label ?? ""}`;
    const existing = interactionCounts.get(key);

    interactionCounts.set(key, {
      targetKey: interaction.target_key,
      targetLabel: interaction.target_label,
      count: (existing?.count ?? 0) + count,
    });
  }

  const topReferrers = toShareRows(referrerCounts, currentRows.length, 6);
  const directSharePct =
    currentRows.length > 0
      ? roundPct(((referrerCounts.get("Direct") ?? 0) / currentRows.length) * 100)
      : 0;
  const devices = toShareRows(deviceCounts, currentRows.length).filter(
    (row) => row.count > 0,
  );
  const countries = toShareRows(countryCounts, currentRows.length, 6);
  const totalSectionViews = Array.from(sectionCounts.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  const sections = ANALYTICS_SECTION_IDS.map((sectionId) => {
    const count = sectionCounts.get(sectionId) ?? 0;

    return {
      id: sectionId,
      label: formatAnalyticsSectionLabel(sectionId),
      count,
      sharePct: totalSectionViews > 0 ? roundPct((count / totalSectionViews) * 100) : 0,
    };
  })
    .filter((row) => row.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });

  const topSection = sections[0] ?? null;
  const scrollDepth = buildScrollDepth(currentRows);
  const topActions = Array.from(interactionCounts.values())
    .map((row) => ({
      targetKey: row.targetKey,
      label: formatAnalyticsTargetLabel(row.targetKey, row.targetLabel),
      count: row.count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 6);

  const currentTotalClicks = Array.from(interactionCounts.values()).reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const hasEngagement =
    currentEngagedSeconds.length > 0 ||
    currentClickedViews > 0 ||
    currentRows.some((row) => Boolean(row.primary_section));

  const insights = buildInsights({
    currentRows,
    topReferrers,
    directSharePct,
    topActions,
    topSection,
    outboundCtr: currentOutboundCtr,
    avgEngagedTime: currentAvgEngagedTime,
    includeEngagementInsights,
  });

  return {
    rangeKey,
    rangeDays,
    rangeLabel,
    allTimeViews,
    state: {
      availability: "full",
      notice: null,
      hasTraffic: currentRows.length > 0,
      hasEngagement,
      lowData: currentRows.length < LOW_DATA_MIN_SAMPLE,
    },
    overview: {
      views: buildMetric(currentRows.length, previousRows.length, currentRows.length + previousRows.length),
      uniqueVisitors: buildMetric(
        currentUniqueVisitors,
        previousUniqueVisitors,
        currentRows.length + previousRows.length,
      ),
      outboundCtr: buildMetric(
        currentOutboundCtr,
        previousOutboundCtr,
        currentRows.length + previousRows.length,
      ),
      avgEngagedTime: buildMetric(
        currentAvgEngagedTime,
        previousAvgEngagedTime,
        currentEngagedSeconds.length + previousEngagedSeconds.length,
        3,
      ),
    },
    trend: {
      dailyViews: buildDailyViews(currentRows, currentStart, rangeDays),
      totalViews: currentRows.length,
      comparison: buildMetric(currentRows.length, previousRows.length, currentRows.length + previousRows.length),
    },
    acquisition: {
      topReferrers,
      directSharePct,
    },
    audience: {
      devices,
      countries,
    },
    followUp: buildFollowUpSignals({
      currentRows,
      topReferrers,
      topSection,
      now,
    }),
    conversion: {
      clickedViews: currentClickedViews,
      totalClicks: currentTotalClicks,
      topActions,
    },
    contentPerformance: {
      topSection,
      sections,
      scrollDepth: scrollDepth.rows,
      avgScrollDepthPct: scrollDepth.avgScrollDepthPct,
    },
    insights,
  };
}

async function fetchInteractionRows(
  supabase: SupabaseClient,
  pageViewIds: string[],
) {
  if (!pageViewIds.length) {
    return [];
  }

  const rows: PageAnalyticsInteractionRow[] = [];

  for (let index = 0; index < pageViewIds.length; index += 200) {
    const chunk = pageViewIds.slice(index, index + 200);
    const { data, error } = await supabase
      .from("page_interactions")
      .select("page_view_id, target_key, target_label, click_count")
      .in("page_view_id", chunk);

    if (error) {
      throw error;
    }

    rows.push(...sanitizeInteractionRows(data ?? []));
  }

  return rows;
}

export function createUnavailablePageAnalyticsDashboard({
  rangeKey,
  allTimeViews,
  notice = UNAVAILABLE_ANALYTICS_NOTICE,
  now = new Date(),
}: CreateFallbackDashboardInput): PageAnalyticsDashboardData {
  return withAvailabilityState(
    buildPageAnalyticsDashboard({
      rangeKey,
      allTimeViews,
      views: [],
      interactions: [],
      includeEngagementInsights: false,
      now,
    }),
    "unavailable",
    notice,
  );
}

async function fetchBasicPageAnalyticsDashboard({
  supabase,
  pageId,
  rangeKey,
  allTimeViews,
  now = new Date(),
}: FetchPageAnalyticsDashboardInput) {
  const rangeDays = ANALYTICS_RANGE_DAYS[rangeKey];
  const fetchStart = startOfUtcDay(addUtcDays(now, -(rangeDays * 2 - 1)));

  const { data, error } = await supabase
    .from("page_views")
    .select(BASIC_VIEW_SELECT)
    .eq("page_id", pageId)
    .gte("viewed_at", fetchStart.toISOString())
    .order("viewed_at", { ascending: true });

  if (error) {
    console.error("analytics.dashboard.query_failed", {
      pageId,
      rangeKey,
      stage: "page_views_basic",
      error: errorMessage(error),
    });

    return createUnavailablePageAnalyticsDashboard({
      rangeKey,
      allTimeViews,
      now,
      notice: UNAVAILABLE_ANALYTICS_NOTICE,
    });
  }

  return withAvailabilityState(
    buildPageAnalyticsDashboard({
      rangeKey,
      allTimeViews,
      views: sanitizeViewRows(data ?? [], "basic"),
      interactions: [],
      includeEngagementInsights: false,
      now,
    }),
    "basic",
    BASIC_ANALYTICS_NOTICE,
  );
}

export async function fetchPageAnalyticsDashboard({
  supabase,
  pageId,
  rangeKey,
  allTimeViews,
  now = new Date(),
}: FetchPageAnalyticsDashboardInput) {
  const rangeDays = ANALYTICS_RANGE_DAYS[rangeKey];
  const fetchStart = startOfUtcDay(addUtcDays(now, -(rangeDays * 2 - 1)));

  const { data: views, error } = await supabase
    .from("page_views")
    .select(FULL_VIEW_SELECT)
    .eq("page_id", pageId)
    .gte("viewed_at", fetchStart.toISOString())
    .order("viewed_at", { ascending: true });

  if (error) {
    if (isRecoverableSchemaError(error)) {
      console.error("analytics.dashboard.schema_fallback", {
        pageId,
        rangeKey,
        stage: "page_views_full",
        error: errorMessage(error),
      });

      return fetchBasicPageAnalyticsDashboard({
        supabase,
        pageId,
        rangeKey,
        allTimeViews,
        now,
      });
    }

    console.error("analytics.dashboard.query_failed", {
      pageId,
      rangeKey,
      stage: "page_views_full",
      error: errorMessage(error),
    });

    return createUnavailablePageAnalyticsDashboard({
      rangeKey,
      allTimeViews,
      now,
      notice: UNAVAILABLE_ANALYTICS_NOTICE,
    });
  }

  const viewRows = sanitizeViewRows(views ?? [], "full");

  try {
    const interactionRows = await fetchInteractionRows(
      supabase,
      viewRows.map((row) => row.id),
    );

    return withAvailabilityState(
      buildPageAnalyticsDashboard({
        rangeKey,
        allTimeViews,
        views: viewRows,
        interactions: interactionRows,
        now,
      }),
      "full",
      null,
    );
  } catch (error) {
    if (isRecoverableSchemaError(error)) {
      console.error("analytics.dashboard.schema_fallback", {
        pageId,
        rangeKey,
        stage: "page_interactions",
        error: errorMessage(error),
      });

      return fetchBasicPageAnalyticsDashboard({
        supabase,
        pageId,
        rangeKey,
        allTimeViews,
        now,
      });
    }

    console.error("analytics.dashboard.query_failed", {
      pageId,
      rangeKey,
      stage: "page_interactions",
      error: errorMessage(error),
    });

    return createUnavailablePageAnalyticsDashboard({
      rangeKey,
      allTimeViews,
      now,
      notice: UNAVAILABLE_ANALYTICS_NOTICE,
    });
  }
}
