/**
 * The three states a page can be in, as the owner understands them.
 *
 * This replaces a state machine that was previously driven by billing: every
 * `getAccountAccessState` path now grants hosting, so "offline" had become
 * unreachable while the need it served — taking your page down without
 * deleting it — had no control at all. Same machinery, owner intent instead of
 * subscription status.
 *
 * "Link only" is expressed with `search_indexable`, not `visibility = 'link'`.
 * That enum value already means a page shared through a secret token: it is
 * required to carry a `share_token_hash` by `pages_link_requires_share_token_chk`
 * and is read back by a token-matching RPC. Indexability is a separate axis, so
 * link-only pages stay `visibility = 'public'` and every existing RLS and
 * storage policy keeps working untouched.
 */

export type PageVisibilityState = "public" | "link" | "offline";

export interface PageVisibilityRecord {
  status?: string | null;
  visibility?: string | null;
  search_indexable?: boolean | null;
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

export interface PageVisibilityWrite {
  status: "live" | "draft";
  visibility: "public" | "private";
  search_indexable: boolean;
}

/** The database columns each state writes. */
export const PAGE_VISIBILITY_WRITES: Record<
  PageVisibilityState,
  PageVisibilityWrite
> = {
  public: { status: "live", visibility: "public", search_indexable: true },
  link: { status: "live", visibility: "public", search_indexable: false },
  offline: { status: "draft", visibility: "private", search_indexable: false },
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
 * those pages were publicly listed, so they read as public. Likewise a null
 * `search_indexable` predates the column and means "indexable".
 */
export function getPageVisibilityState(
  page: PageVisibilityRecord | null | undefined,
): PageVisibilityState {
  if (!page || page.status !== "live") {
    return "offline";
  }

  if (page.visibility !== "public" && page.visibility != null) {
    return "offline";
  }

  return page.search_indexable === false ? "link" : "public";
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
