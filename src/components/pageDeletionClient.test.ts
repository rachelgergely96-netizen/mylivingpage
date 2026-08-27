import { describe, expect, it, vi } from "vitest";
import {
  PAGE_DELETION_FALLBACK_ERROR,
  claimPageDeletionRequest,
  releasePageDeletionRequest,
  requestPageDeletion,
} from "@/components/pageDeletionClient";

function response(ok: boolean, payload: unknown) {
  return {
    ok,
    json: async () => payload,
  };
}

describe("page deletion request lifecycle", () => {
  it("permits only one request until the claim is released", () => {
    const claim = { current: false };

    expect(claimPageDeletionRequest(claim)).toBe(true);
    expect(claimPageDeletionRequest(claim)).toBe(false);
    releasePageDeletionRequest(claim);
    expect(claimPageDeletionRequest(claim)).toBe(true);
  });

  it("accepts only the response-verified success contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(true, { success: true }));

    await expect(requestPageDeletion("page/one", fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith("/api/pages/page%2Fone", { method: "DELETE" });
  });

  it("preserves a bounded friendly server error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(false, { error: "Page access is temporarily unavailable." }),
    );

    await expect(requestPageDeletion("page-1", fetcher)).rejects.toThrow(
      "Page access is temporarily unavailable.",
    );
  });

  it("uses a stable fallback for malformed error and success responses", async () => {
    await expect(
      requestPageDeletion("page-1", vi.fn().mockResolvedValue(response(false, null))),
    ).rejects.toThrow(PAGE_DELETION_FALLBACK_ERROR);
    await expect(
      requestPageDeletion(
        "page-1",
        vi.fn().mockResolvedValue(response(true, { success: "yes" })),
      ),
    ).rejects.toThrow(PAGE_DELETION_FALLBACK_ERROR);
  });

  it("uses the same actionable fallback for network failures", async () => {
    await expect(
      requestPageDeletion(
        "page-1",
        vi.fn().mockRejectedValue(new Error("network unavailable")),
      ),
    ).rejects.toThrow(PAGE_DELETION_FALLBACK_ERROR);
  });
});
