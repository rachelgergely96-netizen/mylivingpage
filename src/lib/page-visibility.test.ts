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

  it("reads a live page withheld from search as link-only", () => {
    expect(
      getPageVisibilityState({
        status: "live",
        visibility: "public",
        search_indexable: false,
      }),
    ).toBe("link");
  });

  it("reads rows written before the visibility column as public", () => {
    expect(getPageVisibilityState({ status: "live", visibility: null })).toBe(
      "public",
    );
  });

  it("reads rows written before search_indexable existed as public", () => {
    expect(
      getPageVisibilityState({
        status: "live",
        visibility: "public",
        search_indexable: null,
      }),
    ).toBe("public");
  });

  it("never produces link-only from visibility='link', which means token sharing", () => {
    // pages_link_requires_share_token_chk owns that enum value; our link-only
    // state must not collide with it.
    expect(getPageVisibilityState({ status: "live", visibility: "link" })).toBe(
      "offline",
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
    const page = { status: "live", visibility: "public", search_indexable: false };
    expect(isPubliclyReachablePage(page)).toBe(true);
    expect(isSearchIndexablePage(page)).toBe(false);
  });

  it("keeps public pages both reachable and indexable", () => {
    const page = { status: "live", visibility: "public", search_indexable: true };
    expect(isPubliclyReachablePage(page)).toBe(true);
    expect(isSearchIndexablePage(page)).toBe(true);
  });

  it("keeps offline pages neither", () => {
    const page = { status: "draft", visibility: "private" };
    expect(isPubliclyReachablePage(page)).toBe(false);
    expect(isSearchIndexablePage(page)).toBe(false);
  });
});

describe("write triples", () => {
  it("never writes visibility='link', which the schema reserves for token sharing", () => {
    for (const write of Object.values(PAGE_VISIBILITY_WRITES)) {
      expect(write.visibility).not.toBe("link");
    }
  });

  it("round-trips every state through its stored columns", () => {
    for (const [state, write] of Object.entries(PAGE_VISIBILITY_WRITES)) {
      expect(getPageVisibilityState(write)).toBe(state);
    }
  });
});

describe("republishing a page that went offline", () => {
  // Coming back online must not quietly make a page searchable again — being
  // unlisted is the whole reason someone chose link-only before taking it down.
  function republishState(page: {
    status?: string | null;
    visibility?: string | null;
    search_indexable?: boolean | null;
  }): "public" | "link" {
    return page.search_indexable === false ? "link" : "public";
  }

  it("restores link-only for a page that was hidden from search", () => {
    const offlineWasLinkOnly = {
      status: "draft",
      visibility: "private",
      search_indexable: false,
    };

    const restored = PAGE_VISIBILITY_WRITES[republishState(offlineWasLinkOnly)];
    expect(getPageVisibilityState(restored)).toBe("link");
    expect(isSearchIndexablePage(restored)).toBe(false);
  });

  it("restores public for a page that was public", () => {
    const offlineWasPublic = {
      status: "draft",
      visibility: "private",
      search_indexable: true,
    };

    const restored = PAGE_VISIBILITY_WRITES[republishState(offlineWasPublic)];
    expect(getPageVisibilityState(restored)).toBe("public");
  });

  it("treats a row predating the column as public", () => {
    const legacyOffline = { status: "draft", visibility: "private" };

    expect(republishState(legacyOffline)).toBe("public");
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
