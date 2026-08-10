import {
  loadDraftEnvelope,
  persistDraftEnvelope,
  removeDraftEnvelope,
  type DraftEnvelope,
} from "@/hooks/useLocalDraft";

/**
 * Where a pre-signup preview parks its work.
 *
 * The create draft key is user-scoped (`mlp-draft-create-<id>`) and null until
 * a session resolves, so someone who has not signed up yet has nowhere to put
 * what they pasted. This is that place, claimed into the user-scoped key on the
 * first authenticated visit to /create.
 *
 * It stays in the same `mlp-draft-` namespace so the existing
 * `clearBrowserLocalDraftStorage` sweep — used on sign-out and account deletion
 * — clears it too.
 */
export const ANONYMOUS_CREATE_DRAFT_KEY = "mlp-draft-create-anonymous";

export function saveAnonymousCreateDraft<T>(data: T): void {
  if (typeof window === "undefined") {
    return;
  }

  persistDraftEnvelope<T>(window.localStorage, ANONYMOUS_CREATE_DRAFT_KEY, {
    data,
    savedAt: Date.now(),
  });
}

export function readAnonymousCreateDraft<T>(): DraftEnvelope<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  return loadDraftEnvelope<T>(window.localStorage, ANONYMOUS_CREATE_DRAFT_KEY);
}

export function discardAnonymousCreateDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  removeDraftEnvelope(window.localStorage, ANONYMOUS_CREATE_DRAFT_KEY);
}

/**
 * Moves a pre-signup draft onto the signed-in user's key.
 *
 * Never overwrites: someone who already has work in progress on this account
 * must not have it replaced by whatever was pasted on the marketing page.
 * Returns true when the draft actually moved.
 */
export function claimAnonymousCreateDraft<T>(userScopedKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const anonymous = readAnonymousCreateDraft<T>();
  if (!anonymous) {
    return false;
  }

  const existing = loadDraftEnvelope<T>(window.localStorage, userScopedKey);
  if (existing) {
    discardAnonymousCreateDraft();
    return false;
  }

  persistDraftEnvelope<T>(window.localStorage, userScopedKey, anonymous);
  discardAnonymousCreateDraft();
  return true;
}
