"use client";

import React, {
  createContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getMotionPreferenceSnapshot,
  getServerMotionPreferenceSnapshot,
  setStoredMotionPreference,
  subscribeToMotionPreference,
} from "@/lib/motion-preference-store";
import type { MotionMode, MotionPreference } from "@/lib/motion";

export interface MotionPreferenceContextValue {
  mode: MotionMode;
  preference: MotionPreference;
  systemReducedMotion: boolean;
  setPreference(next: MotionPreference): void;
}

const DEFAULT_MOTION_PREFERENCE: MotionPreferenceContextValue = {
  mode: "full",
  preference: "system",
  systemReducedMotion: false,
  setPreference: () => undefined,
};

export const MotionPreferenceContext =
  createContext<MotionPreferenceContextValue>(DEFAULT_MOTION_PREFERENCE);

export default function MotionPreferenceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const snapshot = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreferenceSnapshot,
    getServerMotionPreferenceSnapshot,
  );
  const setPreference = useCallback((next: MotionPreference) => {
    setStoredMotionPreference(next);
  }, []);
  const value = useMemo<MotionPreferenceContextValue>(
    () => ({ ...snapshot, setPreference }),
    [snapshot, setPreference],
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      {children}
    </MotionPreferenceContext.Provider>
  );
}
