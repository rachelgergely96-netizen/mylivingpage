/**
 * The three states a page can be in, as the owner understands them.
 *
 * This replaces a state machine that was previously driven by billing: every
 * `getAccountAccessState` path now grants hosting, so "offline" had become
 * unreachable while the need it served — taking your page down without
 * deleting it — had no control at all. Same machinery, owner intent instead of
 * subscription status.
 */

export type PageVisibilityState = "public" | "link" | "offline";

export interface PageVisibilityRecord {
  status?: string | null;
  visibility?: string | null;
}

export const PAGE_VISIBILITY_STATES: PageVisibilityState[] = [
  "public",
  "link",
  "offline",
];

export const PAGE_VISIBILITY_COPY: Record<
  PageVisibilityState,
  { label: string; summary: string }
> = {
  public: {
    label: "Public",
    summary:
      "Anyone with the link can open it, and search engines can list it. Best when you want to be found.",
  },
  link: {
    label: "Link only",
    summary:
      "Anyone with the link can open it, but search engines are asked not to list it and it stays out of the sitemap. Best while you are quietly looking.",
  },
  offline: {
    label: "Offline",
    summary:
      "Nobody can open it. Your address stays reserved, and your page and analytics are kept exactly as they are.",
  },
};

/** The database pair each state writes. */
export const PAGE_VISIBILITY_WRITES: Record<
  PageVisibilityState,
  { status: "live" | "draft"; visibility: "public" | "link" | "private" }
> = {
  public: { status: "live", visibility: "public" },
  link: { status: "live", visibility: "link" },
  offline: { status: "draft", visibility: "private" },
};

export function isPageVisibilityState(
  value: unknown,
): value is PageVisibilityState {
  return (
    typeof value === "string" &&
    PAGE_VISIBILITY_STATES.includes(value as PageVisibilityState)
  );
}

/**
 * Rows written before `visibility` existed carry a null with `status = 'live'`;
 * those pages were publicly listed, so they read as public.
 */
export function getPageVisibilityState(
  page: PageVisibilityRecord | null | undefined,
): PageVisibilityState {
  if (!page || page.status !== "live") {
    return "offline";
  }

  if (page.visibility === "link") {
    return "link";
  }

  if (page.visibility === "public" || page.visibility == null) {
    return "public";
  }

  return "offline";
}

/** Reachable at its public URL — both live states, not offline. */
export function isPubliclyReachablePage(
  page: PageVisibilityRecord | null | undefined,
): boolean {
  return getPageVisibilityState(page) !== "offline";
}

/** Eligible for the sitemap and for indexable robots metadata. */
export function isSearchIndexablePage(
  page: PageVisibilityRecord | null | undefined,
): boolean {
  return getPageVisibilityState(page) === "public";
}
