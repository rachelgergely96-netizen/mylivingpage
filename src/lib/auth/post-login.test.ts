import { describe, expect, it } from "vitest";
import {
  resolvePostLoginDestination,
  withPostLoginWelcome,
} from "@/lib/auth/post-login";

describe("withPostLoginWelcome", () => {
  it("marks only the bare dashboard destination", () => {
    expect(withPostLoginWelcome("/dashboard")).toBe("/dashboard?welcome=1");
  });

  it.each([
    "/dashboard?range=30d",
    "/dashboard/settings",
    "/dashboard/edit/page-1/living-page",
    "/create",
  ])("preserves a non-default post-login destination: %s", (destination) => {
    expect(withPostLoginWelcome(destination)).toBe(destination);
  });
});

describe("resolvePostLoginDestination", () => {
  it.each([
    "/create",
    "/create?ref=homepage",
    "/create?ref=examples#resume-import",
  ])(
    "returns an existing page owner to the welcome-back experience from %s",
    (destination) => {
      expect(resolvePostLoginDestination(destination, true)).toBe(
        "/dashboard?welcome=1",
      );
    },
  );

  it.each(["/dashboard", "/dashboard?welcome=1"])(
    "takes an incomplete account from %s into onboarding",
    (destination) => {
      expect(resolvePostLoginDestination(destination, false)).toBe("/create");
    },
  );

  it("preserves an explicit authenticated deep link", () => {
    expect(
      resolvePostLoginDestination(
        "/dashboard/edit/page-1/living-page",
        true,
      ),
    ).toBe("/dashboard/edit/page-1/living-page");
  });

  it("does not guess when the account-state check is inconclusive", () => {
    expect(resolvePostLoginDestination("/create", null)).toBe("/create");
    expect(resolvePostLoginDestination("/dashboard", null)).toBe(
      "/dashboard?welcome=1",
    );
  });
});
