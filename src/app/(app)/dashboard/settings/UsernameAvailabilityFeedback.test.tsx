import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import UsernameAvailabilityFeedback, {
  readUsernameAvailabilityResponse,
} from "./UsernameAvailabilityFeedback";

function response(ok: boolean, payload: unknown): Pick<Response, "json" | "ok"> {
  return {
    ok,
    json: async () => payload,
  };
}

describe("readUsernameAvailabilityResponse", () => {
  it("keeps a valid unavailable response distinct from a service error", async () => {
    await expect(
      readUsernameAvailabilityResponse(
        response(true, { available: false, reason: "Already taken." }),
      ),
    ).resolves.toEqual({ status: "unavailable", reason: "Already taken." });
  });

  it("turns non-OK and malformed responses into retryable friendly errors", async () => {
    await expect(
      readUsernameAvailabilityResponse(
        response(false, { available: false, reason: "Too many checks just now." }),
      ),
    ).resolves.toEqual({ status: "error", reason: "Too many checks just now." });

    await expect(
      readUsernameAvailabilityResponse(response(true, { available: "yes" })),
    ).resolves.toEqual({
      status: "error",
      reason: "Could not check username availability. Try again.",
    });
  });

  it("accepts a well-formed available response", async () => {
    await expect(
      readUsernameAvailabilityResponse(response(true, { available: true, reason: null })),
    ).resolves.toEqual({ status: "available", reason: null });
  });
});

describe("UsernameAvailabilityFeedback", () => {
  it("renders service failures as persistent alerts with a retry control", () => {
    const markup = renderToStaticMarkup(
      <UsernameAvailabilityFeedback
        checking={false}
        onRetry={vi.fn()}
        result={{ status: "error", reason: "Checks are temporarily unavailable." }}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Checks are temporarily unavailable.");
    expect(markup).toContain(">Try again</button>");
  });

  it("keeps the retry control focusable while announcing a retry in progress", () => {
    const markup = renderToStaticMarkup(
      <UsernameAvailabilityFeedback
        checking
        onRetry={vi.fn()}
        result={{ status: "error", reason: "Checks are temporarily unavailable." }}
      />,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain(" disabled");
    expect(markup).toContain(">Checking…</button>");
  });
});
