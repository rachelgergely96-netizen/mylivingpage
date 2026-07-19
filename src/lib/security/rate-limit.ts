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
  client_error: {
    label: "Client error report",
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    scope: "ip",
  },
  account_delete: {
    label: "Account deletion",
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    scope: "user",
  },
  password_change: {
    label: "Password change",
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    scope: "user",
  },
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
  resume_import: {
    label: "Resume import",
    maxRequests: 12,
    windowMs: 10 * 60 * 1000,
    scope: "user",
  },
  client_event: {
    label: "Client analytics event",
    maxRequests: 120,
    windowMs: 10 * 60 * 1000,
    scope: "user",
  },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

interface EnforceRateLimitInput {
  request: Request;
  policy: RateLimitPolicyName;
  route?: string;
  userId?: string | null;
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

export async function enforceRateLimit(
  input: EnforceRateLimitInput,
): Promise<EnforceRateLimitResult> {
  const config = RATE_LIMIT_POLICIES[input.policy];
  const identifierSource =
    config.scope === "user" && input.userId
      ? `user:${input.userId}`
      : `ip:${getBestEffortRequestIdentifier(input.request.headers)}`;
  const identifierHash = hashSecurityIdentifier(identifierSource);
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("enforce_rate_limit", {
    p_policy: input.policy,
    p_identifier_hash: identifierHash,
    p_scope: config.scope,
    p_route: input.route ?? null,
    p_user_id: input.userId ?? null,
    p_max_requests: config.maxRequests,
    p_window_ms: config.windowMs,
  });

  if (error) {
    throw new Error(`Unable to enforce ${input.policy} rate limit: ${error.message}`);
  }

  const result = (Array.isArray(data) ? data[0] : data) as
    | {
        allowed?: unknown;
        request_count?: unknown;
        remaining?: unknown;
        reset_at?: unknown;
      }
    | null;
  if (
    !result ||
    typeof result.allowed !== "boolean" ||
    typeof result.remaining !== "number" ||
    typeof result.reset_at !== "string"
  ) {
    throw new Error(`Unable to enforce ${input.policy} rate limit: invalid RPC response`);
  }

  const resetAt = result.reset_at;
  if (!result.allowed) {

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

  return {
    limited: false,
    identifierHash,
    resetAt,
    remaining: Math.max(0, result.remaining),
  };
}
