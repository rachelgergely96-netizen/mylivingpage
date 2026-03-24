import type { ThemeId } from "@/themes/types";

export const FREE_THEMES: ThemeId[] = ["cosmic", "fluid", "ember", "monolith", "aurora", "terracotta", "sakura", "circuit", "dusk"];
export const MAX_PAGES_PER_ACCOUNT = 1;
export const MAX_FREE_PAGES = MAX_PAGES_PER_ACCOUNT;
export const MAX_FREE_ARCHIVES = 5;
export type StoredPlan = "spark" | "pro";
export type AccountTier = "basic" | "hosting";

export function isPremiumTheme(themeId: string): boolean {
  return !FREE_THEMES.includes(themeId as ThemeId);
}

export function hasHostingSubscription(plan: string | null | undefined): boolean {
  return plan !== null && plan !== undefined && plan !== "spark";
}

export function getAccountTier(plan: string | null | undefined): AccountTier {
  return hasHostingSubscription(plan) ? "hosting" : "basic";
}

export function getAccountTierLabel(plan: string | null | undefined): string {
  return getAccountTier(plan) === "hosting" ? "hosting active" : "basic access";
}

export function isPremiumPlan(plan: string | null | undefined): boolean {
  return hasHostingSubscription(plan);
}
