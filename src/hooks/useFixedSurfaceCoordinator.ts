"use client";

import { useEffect, useSyncExternalStore } from "react";

export type FixedSurfaceName =
  | "analytics-consent"
  | "mobile-sticky-cta"
  | "acquisition-badge"
  | "public-action-sheet";

const activeSurfaceCounts = new Map<FixedSurfaceName, number>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function addSurface(name: FixedSurfaceName) {
  activeSurfaceCounts.set(name, (activeSurfaceCounts.get(name) ?? 0) + 1);
  emitChange();
}

function removeSurface(name: FixedSurfaceName) {
  const nextCount = Math.max(0, (activeSurfaceCounts.get(name) ?? 0) - 1);
  if (nextCount === 0) {
    activeSurfaceCounts.delete(name);
  } else {
    activeSurfaceCounts.set(name, nextCount);
  }
  emitChange();
}

function getServerSnapshot() {
  return false;
}

/**
 * Registers only the presence of a fixed surface. No page, account, or visitor
 * data enters this coordinator; consumers use it solely to avoid stacked UI.
 */
export function useFixedSurfacePresence(
  name: FixedSurfaceName,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    addSurface(name);
    return () => removeSurface(name);
  }, [active, name]);
}

export function useFixedSurfaceActive(name: FixedSurfaceName) {
  return useSyncExternalStore(
    subscribe,
    () => (activeSurfaceCounts.get(name) ?? 0) > 0,
    getServerSnapshot,
  );
}
