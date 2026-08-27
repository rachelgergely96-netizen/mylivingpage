"use client";

import React from "react";

export type UsernameAvailabilityResult =
  | { status: "available"; reason: null }
  | { status: "unavailable" | "error"; reason: string };

const FALLBACK_ERROR = "Could not check username availability. Try again.";
const MAX_REASON_LENGTH = 240;

function readReason(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const { reason, error } = payload as { reason?: unknown; error?: unknown };
  for (const candidate of [reason, error]) {
    if (typeof candidate !== "string") {
      continue;
    }

    const message = candidate.trim();
    if (message && message.length <= MAX_REASON_LENGTH) {
      return message;
    }
  }

  return null;
}

export async function readUsernameAvailabilityResponse(
  response: Pick<Response, "json" | "ok">,
): Promise<UsernameAvailabilityResult> {
  const payload = await response.json().catch(() => null) as unknown;
  const reason = readReason(payload);

  if (!response.ok) {
    return { status: "error", reason: reason ?? FALLBACK_ERROR };
  }

  if (
    typeof payload !== "object"
    || payload === null
    || Array.isArray(payload)
    || typeof (payload as { available?: unknown }).available !== "boolean"
  ) {
    return { status: "error", reason: FALLBACK_ERROR };
  }

  if ((payload as { available: boolean }).available) {
    return { status: "available", reason: null };
  }

  if (!reason) {
    return { status: "error", reason: FALLBACK_ERROR };
  }

  return { status: "unavailable", reason };
}

interface UsernameAvailabilityFeedbackProps {
  checking: boolean;
  onRetry: () => void;
  result: UsernameAvailabilityResult | null;
}

export default function UsernameAvailabilityFeedback({
  checking,
  onRetry,
  result,
}: UsernameAvailabilityFeedbackProps) {
  if (!result) {
    return checking ? (
      <p id="settings-username-feedback" className="mt-1.5 text-xs text-site-muted" role="status">
        Checking…
      </p>
    ) : null;
  }

  const isError = result.status === "error";
  const message = result.status === "available" ? "Available" : result.reason;

  return (
    <div
      id="settings-username-feedback"
      className={`mt-1.5 flex min-h-11 flex-wrap items-center gap-2 text-xs ${
        result.status === "available" ? "text-site-success" : "text-site-danger"
      }`}
      role={isError ? "alert" : "status"}
      aria-busy={isError && checking ? true : undefined}
    >
      <span>{message}</span>
      {isError ? (
        <button
          type="button"
          onClick={checking ? undefined : onRetry}
          aria-disabled={checking}
          className="site-button site-button-secondary min-h-11 px-3 py-2 text-xs"
        >
          {checking ? "Checking…" : "Try again"}
        </button>
      ) : null}
    </div>
  );
}
