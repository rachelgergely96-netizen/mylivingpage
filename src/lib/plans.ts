import type { ThemeId } from "@/themes/types";

export const FREE_THEMES: ThemeId[] = ["cosmic", "fluid", "ember", "monolith", "aurora", "terracotta", "sakura", "circuit", "dusk"];
export const MAX_FREE_PAGES = 1;
export const MAX_FREE_ARCHIVES = 5;

export function isPremiumTheme(themeId: string): boolean {
  return !FREE_THEMES.includes(themeId as ThemeId);
}

export function isPremiumPlan(plan: string | null | undefined): boolean {
  return plan !== null && plan !== undefined && plan !== "spark";
}
