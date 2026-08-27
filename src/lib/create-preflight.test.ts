import { describe, expect, it } from "vitest";
import {
  CREATE_PREFLIGHT_ERROR,
  resolveCreatePreflight,
} from "@/lib/create-preflight";

describe("resolveCreatePreflight", () => {
  it("returns verified account access, page count, and username", () => {
    const result = resolveCreatePreflight({
      profileResult: {
        data: { plan: "spark", username: "rachel" },
        error: null,
      },
      pagesResult: { count: 1, error: null },
      userEmail: "fallback@example.com",
    });

    expect(result.pageCount).toBe(1);
    expect(result.publicSlug).toBe("rachel");
    expect(result.accountAccess.publicHostingAllowed).toBe(true);
  });

  it("uses the email fallback only after both account reads succeed", () => {
    const result = resolveCreatePreflight({
      profileResult: { data: { plan: "spark", username: null }, error: null },
      pagesResult: { count: 0, error: null },
      userEmail: "Rachel.Gergely@example.com",
    });

    expect(result.publicSlug).toBe("rachel.gergely");
    expect(result.pageCount).toBe(0);
  });

  it.each([
    {
      profileResult: { data: null, error: { message: "profile unavailable" } },
      pagesResult: { count: 0, error: null },
    },
    {
      profileResult: { data: null, error: null },
      pagesResult: { count: null, error: { message: "pages unavailable" } },
    },
    {
      profileResult: { data: null, error: null },
      pagesResult: { count: null, error: null },
    },
  ])("fails closed when account state is inconclusive", (input) => {
    expect(() =>
      resolveCreatePreflight({ ...input, userEmail: "rachel@example.com" }),
    ).toThrow(CREATE_PREFLIGHT_ERROR);
  });
});
