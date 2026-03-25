export const ANALYTICS_RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

export type AnalyticsRangeKey = keyof typeof ANALYTICS_RANGE_DAYS;

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRangeKey = "30d";

export const ANALYTICS_SECTION_IDS = [
  "summary",
  "proof",
  "testimonials",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
] as const;

export type AnalyticsSectionId = (typeof ANALYTICS_SECTION_IDS)[number];

export const ANALYTICS_TARGET_KEYS = [
  "email",
  "linkedin",
  "github",
  "website",
  "experience_company",
  "project",
  "proof_item",
] as const;

export type AnalyticsTargetKey = (typeof ANALYTICS_TARGET_KEYS)[number];

export const MAX_ENGAGED_SECONDS = 1800;
export const MAX_SCROLL_DEPTH_PCT = 100;
export const MAX_TRACKED_CLICK_COUNT = 50;
export const LOW_DATA_MIN_SAMPLE = 5;

export function isAnalyticsRangeKey(value: string | null | undefined): value is AnalyticsRangeKey {
  return Boolean(value && value in ANALYTICS_RANGE_DAYS);
}

export function isAnalyticsSectionId(
  value: string | null | undefined,
): value is AnalyticsSectionId {
  return Boolean(value && ANALYTICS_SECTION_IDS.includes(value as AnalyticsSectionId));
}

export function isAnalyticsTargetKey(
  value: string | null | undefined,
): value is AnalyticsTargetKey {
  return Boolean(value && ANALYTICS_TARGET_KEYS.includes(value as AnalyticsTargetKey));
}
