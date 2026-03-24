import type { ShareScenario } from "@/lib/analytics/proofSummary";
import { buildVariantHref } from "@/lib/page-variants";
import type { PageVariant } from "@/types/resume";

export interface ShareScenarioOption {
  id: ShareScenario;
  label: string;
  shortLabel: string;
  description: string;
}

export const SHARE_SCENARIO_OPTIONS: ShareScenarioOption[] = [
  {
    id: "application_follow_up",
    label: "Follow up on an application",
    shortLabel: "Application",
    description:
      "Use this after you have already applied and want to send a cleaner link than another attachment.",
  },
  {
    id: "recruiter_reply",
    label: "Reply to a recruiter",
    shortLabel: "Recruiter",
    description:
      "Use this when a recruiter asked for more context and you want a fast, scannable next step.",
  },
  {
    id: "connection",
    label: "Send to a connection",
    shortLabel: "Connection",
    description:
      "Use this for referrals, warm intros, or anyone deciding whether to pass you along.",
  },
];

export function getShareScenarioLabel(scenario: ShareScenario | null) {
  return SHARE_SCENARIO_OPTIONS.find((option) => option.id === scenario)?.label ?? null;
}

export function createShareLinkId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `share-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildTrackedSharePath(
  livePath: string,
  scenario: ShareScenario,
  options?: {
    variant?: PageVariant | null;
    shareLinkId?: string | null;
  },
) {
  return buildVariantHref(livePath, {
    variantId: options?.variant?.id ?? null,
    scenario,
    shareLinkId: options?.shareLinkId ?? null,
  });
}

export function buildShareScenarioMessage(
  scenario: ShareScenario,
  liveUrl: string,
  variant?: PageVariant | null,
) {
  const roleLabel = variant?.label ? ` for my ${variant.label.toLowerCase()}` : "";

  switch (scenario) {
    case "application_follow_up":
      return `Hi - I wanted to share a cleaner version of my background${roleLabel} here: ${liveUrl}`;
    case "recruiter_reply":
      return `Hi - here is a cleaner view of my background${roleLabel} and current work: ${liveUrl}`;
    case "connection":
      return `Hi - sharing a quick page that makes my background${roleLabel} easier to scan: ${liveUrl}`;
    default:
      return liveUrl;
  }
}
