"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

const LOCAL_DRAFT_STORAGE_PREFIX = "mlp-draft-";

export function clearLocalDraftStorage(
  storage: Pick<Storage, "key" | "length" | "removeItem">,
) {
  const draftKeys: string[] = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(LOCAL_DRAFT_STORAGE_PREFIX)) {
        draftKeys.push(key);
      }
    }
  } catch {
    return;
  }

  draftKeys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
  });
}

export function clearBrowserLocalDraftStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    clearLocalDraftStorage(window.localStorage);
  } catch {
    // Accessing localStorage itself can fail in hardened browser modes.
  }
}

export function loadDraftEnvelope<T>(
  storage: Pick<Storage, "getItem" | "removeItem">,
  key: string | null,
) {
  if (!key) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DraftEnvelope<T>;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
    return null;
  }
}

export function persistDraftEnvelope<T>(
  storage: Pick<Storage, "setItem">,
  key: string | null,
  envelope: DraftEnvelope<T>,
): boolean {
  if (!key) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    // Callers decide whether a failed write can be ignored or must block a
    // handoff that depends on the draft being available later.
    return false;
  }
}

export function removeDraftEnvelope(
  storage: Pick<Storage, "removeItem">,
  key: string | null,
) {
  if (!key) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // localStorage can be unavailable in hardened browser modes.
  }
}

export function useLocalDraft<T>(key: string | null) {
  const [pendingDraft, setPendingDraft] = useState<DraftEnvelope<T> | null>(null);
  // True once loadDraftEnvelope has actually run for the current non-null key,
  // so callers can distinguish "no draft" from "draft not loaded yet".
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!key) {
      setPendingDraft(null);
      setHydrated(false);
      return undefined;
    }

    setPendingDraft(loadDraftEnvelope<T>(localStorage, key));
    setHydrated(true);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [key]);

  const saveDraft = useCallback(
    (data: T) => {
      if (!key) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        persistDraftEnvelope(localStorage, key, {
          data,
          savedAt: Date.now(),
        });
        timerRef.current = null;
      }, 1000);
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    removeDraftEnvelope(localStorage, key);
    setPendingDraft(null);
  }, [key]);

  const dismissDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPendingDraft(null);
    removeDraftEnvelope(localStorage, key);
  }, [key]);

  return { pendingDraft, hydrated, saveDraft, clearDraft, dismissDraft };
}
