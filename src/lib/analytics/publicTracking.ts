import {
  MAX_ENGAGED_SECONDS,
  MAX_SCROLL_DEPTH_PCT,
  MAX_TRACKED_CLICK_COUNT,
  isAnalyticsSectionId,
  isAnalyticsTargetKey,
  type AnalyticsSectionId,
  type AnalyticsTargetKey,
} from "@/lib/analytics/constants";

interface PlainObject {
  [key: string]: unknown;
}

export interface AnalyticsClickPayload {
  targetKey: AnalyticsTargetKey;
  targetLabel: string | null;
  count: number;
}

export interface AnalyticsEngagementPayload {
  pageId: string;
  pageViewId: string;
  engagedSeconds: number;
  maxScrollDepthPct: number;
  primarySection: AnalyticsSectionId | null;
  clicks: AnalyticsClickPayload[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toUuid(value: unknown) {
  return typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim() : null;
}

function toTrimmedLabel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 120) : null;
}

function toRoundedNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

export function normalizeEngagementPayload(
  input: unknown,
): AnalyticsEngagementPayload | null {
  if (!isPlainObject(input)) {
    return null;
  }

  const pageId = toUuid(input.pageId);
  const pageViewId = toUuid(input.pageViewId);

  if (!pageId || !pageViewId) {
    return null;
  }

  const primarySection = isAnalyticsSectionId(input.primarySection as string)
    ? (input.primarySection as AnalyticsSectionId)
    : null;

  const clickMap = new Map<string, AnalyticsClickPayload>();
  const rawClicks = Array.isArray(input.clicks) ? input.clicks.slice(0, 100) : [];

  for (const click of rawClicks) {
    if (!isPlainObject(click)) {
      continue;
    }

    const targetKey = isAnalyticsTargetKey(click.targetKey as string)
      ? (click.targetKey as AnalyticsTargetKey)
      : null;

    if (!targetKey) {
      continue;
    }

    const targetLabel = toTrimmedLabel(click.targetLabel);
    const count = clamp(
      Math.max(1, toRoundedNumber(click.count)),
      1,
      MAX_TRACKED_CLICK_COUNT,
    );
    const mapKey = `${targetKey}::${targetLabel ?? ""}`;
    const existing = clickMap.get(mapKey);

    clickMap.set(mapKey, {
      targetKey,
      targetLabel,
      count: clamp((existing?.count ?? 0) + count, 1, MAX_TRACKED_CLICK_COUNT),
    });
  }

  return {
    pageId,
    pageViewId,
    engagedSeconds: clamp(
      Math.max(0, toRoundedNumber(input.engagedSeconds)),
      0,
      MAX_ENGAGED_SECONDS,
    ),
    maxScrollDepthPct: clamp(
      Math.max(0, toRoundedNumber(input.maxScrollDepthPct)),
      0,
      MAX_SCROLL_DEPTH_PCT,
    ),
    primarySection,
    clicks: Array.from(clickMap.values()),
  };
}

export function formatAnalyticsSectionLabel(sectionId: AnalyticsSectionId) {
  return sectionId
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatAnalyticsTargetLabel(
  targetKey: AnalyticsTargetKey,
  targetLabel: string | null,
) {
  if (targetKey === "project" && targetLabel) {
    return `Project: ${targetLabel}`;
  }

  if (targetKey === "experience_company" && targetLabel) {
    return `Company: ${targetLabel}`;
  }

  if (targetKey === "proof_item" && targetLabel) {
    return `Proof: ${targetLabel}`;
  }

  if (targetLabel) {
    return targetLabel;
  }

  switch (targetKey) {
    case "email":
      return "Email";
    case "linkedin":
      return "LinkedIn";
    case "github":
      return "GitHub";
    case "website":
      return "Website";
    case "experience_company":
      return "Company link";
    case "project":
      return "Project link";
    case "proof_item":
      return "Proof link";
    default:
      return "Link";
  }
}
