export const PAGE_DELETION_FALLBACK_ERROR =
  "The page could not be deleted. Check your connection and try again.";

const MAX_ERROR_LENGTH = 240;

interface PageDeletionRequestClaim {
  current: boolean;
}

interface PageDeletionResponse {
  json: () => Promise<unknown>;
  ok: boolean;
}

type PageDeletionFetch = (
  input: string,
  init: { method: "DELETE" },
) => Promise<PageDeletionResponse>;

function readServerError(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const candidate = (payload as { error?: unknown }).error;
  if (typeof candidate !== "string") {
    return null;
  }

  const message = candidate.trim();
  return message && message.length <= MAX_ERROR_LENGTH ? message : null;
}

export function claimPageDeletionRequest(claim: PageDeletionRequestClaim) {
  if (claim.current) {
    return false;
  }
  claim.current = true;
  return true;
}

export function releasePageDeletionRequest(claim: PageDeletionRequestClaim) {
  claim.current = false;
}

export async function requestPageDeletion(
  pageId: string,
  fetcher: PageDeletionFetch = fetch,
) {
  let response: PageDeletionResponse;
  try {
    response = await fetcher(`/api/pages/${encodeURIComponent(pageId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error(PAGE_DELETION_FALLBACK_ERROR);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readServerError(payload) ?? PAGE_DELETION_FALLBACK_ERROR);
  }

  if (
    typeof payload !== "object"
    || payload === null
    || Array.isArray(payload)
    || (payload as { success?: unknown }).success !== true
  ) {
    throw new Error(PAGE_DELETION_FALLBACK_ERROR);
  }
}
