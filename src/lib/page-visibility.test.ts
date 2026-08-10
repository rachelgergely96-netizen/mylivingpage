import { describe, expect, it } from "vitest";
import {
  PAGE_VISIBILITY_WRITES,
  getPageVisibilityState,
  isPageVisibilityState,
  isPubliclyReachablePage,
  isSearchIndexablePage,
} from "@/lib/page-visibility";

describe("getPageVisibilityState", () => {
  it("reads a live public page as public", () => {
    expect(getPageVisibilityState({ status: "live", visibility: "public" })).toBe(
      "public",
    );
  });

  it("reads a live link-only page as link", () => {
    expect(getPageVisibilityState({ status: "live", visibility: "link" })).toBe(
      "link",
    );
  });

  it("reads rows written before the visibility column as public", () => {
    expect(getPageVisibilityState({ status: "live", visibility: null })).toBe(
      "public",
    );
  });

  it("reads a draft as offline whatever its visibility says", () => {
    expect(getPageVisibilityState({ status: "draft", visibility: "public" })).toBe(
      "offline",
    );
    expect(getPageVisibilityState({ status: "draft", visibility: "private" })).toBe(
      "offline",
    );
  });

  it("reads an archived page as offline", () => {
    expect(getPageVisibilityState({ status: "archived", visibility: "public" })).toBe(
      "offline",
    );
  });

  it("reads a missing page as offline", () => {
    expect(getPageVisibilityState(null)).toBe("offline");
    expect(getPageVisibilityState(undefined)).toBe("offline");
  });
});

describe("reachability versus indexability", () => {
  it("keeps link-only pages reachable but not indexable — the whole point of the state", () => {
    const page = { status: "live", visibility: "link" };
    expect(isPubliclyReachablePage(page)).toBe(true);
    expect(isSearchIndexablePage(page)).toBe(false);
  });

  it("keeps public pages both reachable and indexable", () => {
    const page = { status: "live", visibility: "public" };
    expect(isPubliclyReachablePage(page)).toBe(true);
    expect(isSearchIndexablePage(page)).toBe(true);
  });

  it("keeps offline pages neither", () => {
    const page = { status: "draft", visibility: "private" };
    expect(isPubliclyReachablePage(page)).toBe(false);
    expect(isSearchIndexablePage(page)).toBe(false);
  });
});

describe("write pairs", () => {
  it("round-trips every state through its stored status/visibility pair", () => {
    for (const [state, write] of Object.entries(PAGE_VISIBILITY_WRITES)) {
      expect(getPageVisibilityState(write)).toBe(state);
    }
  });
});

describe("isPageVisibilityState", () => {
  it("accepts the three states and rejects stored column values", () => {
    expect(isPageVisibilityState("public")).toBe(true);
    expect(isPageVisibilityState("link")).toBe(true);
    expect(isPageVisibilityState("offline")).toBe(true);
    expect(isPageVisibilityState("private")).toBe(false);
    expect(isPageVisibilityState("live")).toBe(false);
    expect(isPageVisibilityState(null)).toBe(false);
  });
});
