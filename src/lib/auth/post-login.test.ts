import { describe, expect, it } from "vitest";
import { withPostLoginWelcome } from "@/lib/auth/post-login";

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
