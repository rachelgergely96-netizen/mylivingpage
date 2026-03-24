import type { ShareScenario } from "@/lib/analytics/proofSummary";

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
    description: "Use this after you have already applied and want to send a cleaner link than another attachment.",
  },
  {
    id: "recruiter_reply",
    label: "Reply to a recruiter",
    shortLabel: "Recruiter",
    description: "Use this when a recruiter asked for more context and you want a fast, scannable next step.",
  },
  {
    id: "connection",
    label: "Send to a connection",
    shortLabel: "Connection",
    description: "Use this for referrals, warm intros, or anyone deciding whether to pass you along.",
  },
];

export function getShareScenarioLabel(scenario: ShareScenario | null) {
  return (
    SHARE_SCENARIO_OPTIONS.find((option) => option.id === scenario)?.label ?? null
  );
}

export function buildShareScenarioMessage(scenario: ShareScenario, liveUrl: string) {
  switch (scenario) {
    case "application_follow_up":
      return `Hi — I wanted to share a cleaner version of my background here: ${liveUrl}`;
    case "recruiter_reply":
      return `Hi — here is a cleaner view of my background and current work: ${liveUrl}`;
    case "connection":
      return `Hi — sharing a quick page that makes my background easier to scan: ${liveUrl}`;
    default:
      return liveUrl;
  }
}
