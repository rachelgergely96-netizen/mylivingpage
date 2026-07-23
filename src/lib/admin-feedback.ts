import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";

export type FeedbackType = "bug" | "feature" | "general";

export interface AdminFeedbackEventRow {
  id: string;
  user_id: string | null;
  metadata: {
    message?: unknown;
    type?: unknown;
    page?: unknown;
  } | null;
  created_at: string;
}

export interface AdminFeedbackProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

export interface AdminFeedbackItem {
  id: string;
  userId: string | null;
  message: string;
  type: FeedbackType;
  page: string | null;
  createdAt: string;
  sender: {
    displayName: string;
    username: string | null;
    email: string | null;
  };
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feature: "Idea",
  general: "General note",
};

export function normalizeFeedbackType(value: unknown): FeedbackType {
  return value === "bug" || value === "feature" ? value : "general";
}

function optionalFeedbackString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function buildAdminFeedbackItems(input: {
  events: AdminFeedbackEventRow[];
  profiles: AdminFeedbackProfileRow[];
}): AdminFeedbackItem[] {
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));

  return input.events.map((event) => {
    const profile = event.user_id ? profileById.get(event.user_id) : null;
    const username = optionalFeedbackString(profile?.username);
    const fullName = optionalFeedbackString(profile?.full_name);
    const email = optionalFeedbackString(profile?.email);
    const page = optionalFeedbackString(event.metadata?.page);

    return {
      id: event.id,
      userId: event.user_id,
      message: optionalFeedbackString(event.metadata?.message) ?? "(No message)",
      type: normalizeFeedbackType(event.metadata?.type),
      page: page ? sanitizeInternalRedirectPath(page, "") || null : null,
      createdAt: event.created_at,
      sender: {
        displayName: fullName ?? username ?? email ?? "Unknown user",
        username,
        email,
      },
    };
  });
}

export function countFeedbackByType(items: AdminFeedbackItem[]) {
  return items.reduce<Record<FeedbackType, number>>(
    (counts, item) => {
      counts[item.type] += 1;
      return counts;
    },
    { bug: 0, feature: 0, general: 0 },
  );
}
