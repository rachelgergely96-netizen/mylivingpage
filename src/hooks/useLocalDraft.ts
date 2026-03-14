"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
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
    storage.removeItem(key);
    return null;
  }
}

export function persistDraftEnvelope<T>(
  storage: Pick<Storage, "setItem">,
  key: string | null,
  envelope: DraftEnvelope<T>,
) {
  if (!key) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(envelope));
  } catch {
    // localStorage full or unavailable - silently ignore
  }
}

export function removeDraftEnvelope(
  storage: Pick<Storage, "removeItem">,
  key: string | null,
) {
  if (!key) {
    return;
  }

  storage.removeItem(key);
}

export function useLocalDraft<T>(key: string | null) {
  const [pendingDraft, setPendingDraft] = useState<DraftEnvelope<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!key) {
      setPendingDraft(null);
      return;
    }

    setPendingDraft(loadDraftEnvelope<T>(localStorage, key));
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
      }, 1000);
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    removeDraftEnvelope(localStorage, key);
    setPendingDraft(null);
  }, [key]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
    removeDraftEnvelope(localStorage, key);
  }, [key]);

  return { pendingDraft, saveDraft, clearDraft, dismissDraft };
}
