import type { ThemeId } from "@/themes/types";

export const STARTER_THEMES: ThemeId[] = [
  "cosmic",
  "fluid",
  "ember",
  "monolith",
  "aurora",
  "terracotta",
  "sakura",
  "circuit",
  "dusk",
];
export const FREE_PREVIEW_THEMES: ThemeId[] = STARTER_THEMES.slice(0, 3);
export const FREE_THEMES = STARTER_THEMES;
export const MAX_PAGES_PER_ACCOUNT = 1;
export const MAX_FREE_PAGES = MAX_PAGES_PER_ACCOUNT;
export const MAX_FREE_ARCHIVES = 5;
export type StoredPlan = "spark" | "starter" | "pro";
export type PaidPlan = Exclude<StoredPlan, "spark">;
export type AccountTier = "basic" | "hosting";

export function isPremiumTheme(themeId: string): boolean {
  return !STARTER_THEMES.includes(themeId as ThemeId);
}

export function isThemeAllowed(
  themeId: string,
  allowedThemeIds: ThemeId[] | null | undefined,
): boolean {
  return allowedThemeIds === null || allowedThemeIds === undefined
    ? true
    : allowedThemeIds.includes(themeId as ThemeId);
}

export function getPublicPlanLabel(plan: string | null | undefined): "Free" | "Starter" | "Pro" {
  if (plan === "starter") {
    return "Starter";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

export function isProPlan(plan: string | null | undefined): boolean {
  return plan === "pro";
}

export function hasHostingSubscription(plan: string | null | undefined): boolean {
  return plan === "starter" || plan === "pro";
}

export function getAccountTier(plan: string | null | undefined): AccountTier {
  return hasHostingSubscription(plan) ? "hosting" : "basic";
}

export function getAccountTierLabel(plan: string | null | undefined): string {
  const publicLabel = getPublicPlanLabel(plan);
  return publicLabel === "Free" ? "free preview" : `${publicLabel.toLowerCase()} active`;
}

export function isPremiumPlan(plan: string | null | undefined): boolean {
  return isProPlan(plan);
}
