import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  getBestEffortRequestIdentifier,
  hashSecurityIdentifier,
} from "@/lib/security/request";

export interface RateLimitPolicy {
  label: string;
  maxRequests: number;
  windowMs: number;
  scope: "ip" | "user";
}

export const RATE_LIMIT_POLICIES = {
  waitlist_submit: {
    label: "Waitlist submit",
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    scope: "ip",
  },
  username_check: {
    label: "Username availability",
    maxRequests: 60,
    windowMs: 10 * 60 * 1000,
    scope: "ip",
  },
  public_page_view: {
    label: "Public page view",
    maxRequests: 30,
    windowMs: 10 * 60 * 1000,
    scope: "ip",
  },
  public_page_engagement: {
    label: "Public page engagement",
    maxRequests: 120,
    windowMs: 10 * 60 * 1000,
    scope: "ip",
  },
  ats_export_download: {
    label: "Public resume download",
    maxRequests: 12,
    windowMs: 60 * 60 * 1000,
    scope: "ip",
  },
  ats_export_preview: {
    label: "Resume preview",
    maxRequests: 24,
    windowMs: 10 * 60 * 1000,
    scope: "user",
  },
  ats_export_check: {
    label: "Resume validation",
    maxRequests: 60,
    windowMs: 10 * 60 * 1000,
    scope: "user",
  },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

interface RateLimitEventMetadata {
  policy: RateLimitPolicyName;
  identifier_hash: string;
  scope: RateLimitPolicy["scope"];
  route: string | null;
  max_requests: number;
  window_ms: number;
  reset_at: string;
}

interface EnforceRateLimitInput {
  request: Request;
  policy: RateLimitPolicyName;
  route?: string;
  userId?: string | null;
  now?: Date;
}

interface RateLimitAllowedResult {
  limited: false;
  identifierHash: string;
  remaining: number;
  resetAt: string;
}

interface RateLimitBlockedResult {
  limited: true;
  identifierHash: string;
  resetAt: string;
  response: NextResponse<{ error: string; resetAt: string }>;
}

export type EnforceRateLimitResult =
  | RateLimitAllowedResult
  | RateLimitBlockedResult;

export function getRateLimitWindowStart(
  policy: RateLimitPolicyName,
  now: Date = new Date(),
) {
  return new Date(now.getTime() - RATE_LIMIT_POLICIES[policy].windowMs);
}

export function getRateLimitResetAt(
  policy: RateLimitPolicyName,
  now: Date = new Date(),
) {
  return new Date(now.getTime() + RATE_LIMIT_POLICIES[policy].windowMs);
}

export function isRateLimitExceeded(requestCount: number, maxRequests: number) {
  return requestCount >= maxRequests;
}

function buildRateLimitMetadata(input: {
  policy: RateLimitPolicyName;
  identifierHash: string;
  route?: string;
  resetAt: string;
}): RateLimitEventMetadata {
  const config = RATE_LIMIT_POLICIES[input.policy];
  return {
    policy: input.policy,
    identifier_hash: input.identifierHash,
    scope: config.scope,
    route: input.route ?? null,
    max_requests: config.maxRequests,
    window_ms: config.windowMs,
    reset_at: input.resetAt,
  };
}

export async function enforceRateLimit(
  input: EnforceRateLimitInput,
): Promise<EnforceRateLimitResult> {
  const config = RATE_LIMIT_POLICIES[input.policy];
  const now = input.now ?? new Date();
  const identifierSource =
    config.scope === "user" && input.userId
      ? `user:${input.userId}`
      : `ip:${getBestEffortRequestIdentifier(input.request.headers)}`;
  const identifierHash = hashSecurityIdentifier(identifierSource);
  const windowStart = getRateLimitWindowStart(input.policy, now).toISOString();
  const resetAt = getRateLimitResetAt(input.policy, now).toISOString();
  const metadata = buildRateLimitMetadata({
    policy: input.policy,
    identifierHash,
    route: input.route,
    resetAt,
  });
  const supabase = createServiceRoleSupabaseClient();

  const { count, error: countError } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "security.rate_limit.request")
    .gte("created_at", windowStart)
    .contains("metadata", {
      policy: input.policy,
      identifier_hash: identifierHash,
    });

  if (countError) {
    throw new Error(`Unable to enforce ${input.policy} rate limit: ${countError.message}`);
  }

  const recentCount = count ?? 0;
  if (isRateLimitExceeded(recentCount, config.maxRequests)) {
    await supabase.from("events").insert({
      user_id: input.userId ?? null,
      event_name: "security.rate_limit.blocked",
      metadata,
    });

    return {
      limited: true,
      identifierHash,
      resetAt,
      response: NextResponse.json(
        {
          error: `Too many ${config.label.toLowerCase()} requests. Please try again later.`,
          resetAt,
        },
        { status: 429 },
      ),
    };
  }

  const { error: insertError } = await supabase.from("events").insert({
    user_id: input.userId ?? null,
    event_name: "security.rate_limit.request",
    metadata,
  });

  if (insertError) {
    throw new Error(`Unable to record ${input.policy} rate limit event: ${insertError.message}`);
  }

  return {
    limited: false,
    identifierHash,
    resetAt,
    remaining: Math.max(0, config.maxRequests - recentCount - 1),
  };
}
