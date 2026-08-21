import {
  MOTION_STORAGE_KEY,
  parseMotionPreference,
  resolveMotionMode,
  type MotionMode,
  type MotionPreference,
} from "@/lib/motion";

export interface MotionPreferenceSnapshot {
  mode: MotionMode;
  preference: MotionPreference;
  systemReducedMotion: boolean;
}

const SERVER_SNAPSHOT: MotionPreferenceSnapshot = {
  mode: "full",
  preference: "system",
  systemReducedMotion: false,
};

let snapshot = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function readStoredPreference(): MotionPreference {
  try {
    return parseMotionPreference(window.localStorage.getItem(MOTION_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyRootAttributes(next: MotionPreferenceSnapshot): void {
  document.documentElement.dataset.motionMode = next.mode;
  document.documentElement.dataset.motionPreference = next.preference;
}

function publish(
  preference: MotionPreference,
  systemReducedMotion: boolean,
): void {
  const next: MotionPreferenceSnapshot = {
    preference,
    systemReducedMotion,
    mode: resolveMotionMode(preference, systemReducedMotion),
  };
  const changed =
    next.mode !== snapshot.mode ||
    next.preference !== snapshot.preference ||
    next.systemReducedMotion !== snapshot.systemReducedMotion;
  applyRootAttributes(next);
  if (!changed) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function initializeBrowserStore(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const query = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  publish(readStoredPreference(), query?.matches ?? false);

  const handleSystemPreference = () => {
    publish(snapshot.preference, query?.matches ?? false);
  };
  if (query) {
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleSystemPreference);
    } else {
      query.addListener?.(handleSystemPreference);
    }
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== MOTION_STORAGE_KEY) return;
    publish(readStoredPreference(), query?.matches ?? false);
  });
}

export function subscribeToMotionPreference(listener: () => void): () => void {
  initializeBrowserStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMotionPreferenceSnapshot(): MotionPreferenceSnapshot {
  initializeBrowserStore();
  return snapshot;
}

export function getServerMotionPreferenceSnapshot(): MotionPreferenceSnapshot {
  return SERVER_SNAPSHOT;
}

export function setStoredMotionPreference(next: MotionPreference): void {
  initializeBrowserStore();
  try {
    if (next === "system") {
      window.localStorage.removeItem(MOTION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(MOTION_STORAGE_KEY, next);
    }
  } catch {
    // The in-memory preference still applies when storage is unavailable.
  }
  publish(next, snapshot.systemReducedMotion);
}
