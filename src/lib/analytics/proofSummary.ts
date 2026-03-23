export const SHARE_INTENT_EVENT_NAMES = [
  "page.share.copy_link",
  "page.share.download_card",
  "page.share.open_live_page",
] as const;

export type ShareIntentEventName = (typeof SHARE_INTENT_EVENT_NAMES)[number];

export interface PageProofViewRow {
  page_id: string;
  viewed_at: string;
  user_agent: string | null;
  engaged_seconds: number | null;
}

export interface PageProofEventRow {
  event_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export type PageProofStatus =
  | "ready_to_share"
  | "awaiting_views"
  | "proof_landed"
  | "active";

export interface PageProofSummary {
  pageId: string;
  status: PageProofStatus;
  viewsLast7d: number;
  mobileViewsLast7d: number;
  avgEngagedSecondsLast7d: number | null;
  shareIntentCountLast7d: number;
  lastShareAt: string | null;
  latestViewAt: string | null;
  firstViewAfterLatestShareAt: string | null;
}

interface BuildPageProofSummaryInput {
  pageId: string;
  views: PageProofViewRow[];
  events: PageProofEventRow[];
  now?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadataPageId(metadata: Record<string, unknown> | null) {
  const pageId = metadata?.page_id;
  return typeof pageId === "string" && pageId.trim().length > 0 ? pageId : null;
}

function isMobile(userAgent: string | null) {
  return /Mobile|Android|iPhone/i.test(userAgent ?? "");
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildPageProofSummary({
  pageId,
  views,
  events,
  now = new Date(),
}: BuildPageProofSummaryInput): PageProofSummary {
  const last7dCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const pageViews = views
    .filter((view) => view.page_id === pageId)
    .sort((left, right) => left.viewed_at.localeCompare(right.viewed_at));
  const shareEvents = events
    .filter(
      (event) =>
        SHARE_INTENT_EVENT_NAMES.includes(event.event_name as ShareIntentEventName) &&
        isRecord(event.metadata) &&
        getMetadataPageId(event.metadata) === pageId,
    )
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

  const recentViews = pageViews.filter((view) => view.viewed_at >= last7dCutoff);
  const recentShareEvents = shareEvents.filter((event) => event.created_at >= last7dCutoff);
  const latestViewAt = pageViews.at(-1)?.viewed_at ?? null;
  const lastShareAt = shareEvents.at(-1)?.created_at ?? null;
  const firstViewAfterLatestShareAt = lastShareAt
    ? pageViews.find((view) => view.viewed_at >= lastShareAt)?.viewed_at ?? null
    : null;
  const recentEngagedSeconds = recentViews
    .map((view) => view.engaged_seconds)
    .filter((value): value is number => typeof value === "number" && value > 0);

  let status: PageProofStatus = "ready_to_share";

  if (
    lastShareAt &&
    lastShareAt >= last7dCutoff &&
    (!latestViewAt || latestViewAt < lastShareAt)
  ) {
    status = "awaiting_views";
  } else if (
    lastShareAt &&
    lastShareAt >= last7dCutoff &&
    firstViewAfterLatestShareAt &&
    firstViewAfterLatestShareAt >= lastShareAt
  ) {
    status = "proof_landed";
  } else if (recentViews.length > 0) {
    status = "active";
  }

  return {
    pageId,
    status,
    viewsLast7d: recentViews.length,
    mobileViewsLast7d: recentViews.filter((view) => isMobile(view.user_agent)).length,
    avgEngagedSecondsLast7d: average(recentEngagedSeconds),
    shareIntentCountLast7d: recentShareEvents.length,
    lastShareAt,
    latestViewAt,
    firstViewAfterLatestShareAt,
  };
}
