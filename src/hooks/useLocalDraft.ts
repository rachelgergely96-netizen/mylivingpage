"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

export function useLocalDraft<T>(key: string) {
  const [pendingDraft, setPendingDraft] = useState<DraftEnvelope<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const envelope = JSON.parse(raw) as DraftEnvelope<T>;
        setPendingDraft(envelope);
      }
    } catch {
      // Corrupted draft — remove it
      localStorage.removeItem(key);
    }
  }, [key]);

  // Save draft (debounced 1s)
  const saveDraft = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
          localStorage.setItem(key, JSON.stringify(envelope));
        } catch {
          // localStorage full or unavailable — silently ignore
        }
      }, 1000);
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(key);
    setPendingDraft(null);
  }, [key]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
    localStorage.removeItem(key);
  }, [key]);

  return { pendingDraft, saveDraft, clearDraft, dismissDraft };
}
