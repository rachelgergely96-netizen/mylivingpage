import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOTION_PREFERENCE_BOOTSTRAP_SCRIPT,
  MOTION_STORAGE_KEY,
} from "@/lib/motion";

interface FakeBrowser {
  documentElement: { dataset: Record<string, string> };
  emitMediaChange(matches: boolean): void;
  emitStorage(key?: string | null): void;
  localStorage: {
    getItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  mediaListeners: Set<() => void>;
  storage: Map<string, string>;
}

function installFakeBrowser({
  initialPreference,
  reducedMotion = false,
  throwOnRead = false,
  throwOnWrite = false,
}: {
  initialPreference?: string;
  reducedMotion?: boolean;
  throwOnRead?: boolean;
  throwOnWrite?: boolean;
} = {}): FakeBrowser {
  const storage = new Map<string, string>();
  if (initialPreference !== undefined) {
    storage.set(MOTION_STORAGE_KEY, initialPreference);
  }

  const documentElement = { dataset: {} as Record<string, string> };
  const mediaListeners = new Set<() => void>();
  const storageListeners = new Set<(event: { key: string | null }) => void>();
  const mediaQuery = {
    matches: reducedMotion,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      mediaListeners.add(listener);
    }),
    addListener: vi.fn((listener: () => void) => {
      mediaListeners.add(listener);
    }),
  };
  const localStorage = {
    getItem: vi.fn((key: string) => {
      if (throwOnRead) throw new Error("Storage unavailable");
      return storage.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (throwOnWrite) throw new Error("Storage unavailable");
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      if (throwOnWrite) throw new Error("Storage unavailable");
      storage.delete(key);
    }),
  };
  const fakeWindow = {
    localStorage,
    matchMedia: vi.fn(() => mediaQuery),
    addEventListener: vi.fn(
      (event: string, listener: (storageEvent: { key: string | null }) => void) => {
        if (event === "storage") storageListeners.add(listener);
      },
    ),
  };

  vi.stubGlobal("document", { documentElement });
  vi.stubGlobal("window", fakeWindow);

  return {
    documentElement,
    localStorage,
    mediaListeners,
    storage,
    emitMediaChange(matches: boolean) {
      mediaQuery.matches = matches;
      mediaListeners.forEach((listener) => listener());
    },
    emitStorage(key: string | null = MOTION_STORAGE_KEY) {
      storageListeners.forEach((listener) => listener({ key }));
    },
  };
}

async function loadStore() {
  return import("@/lib/motion-preference-store");
}

describe("motion preference store", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows live system changes while Device is selected", async () => {
    const browser = installFakeBrowser();
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribeToMotionPreference(listener);

    expect(store.getMotionPreferenceSnapshot()).toEqual({
      mode: "full",
      preference: "system",
      systemReducedMotion: false,
    });

    browser.emitMediaChange(true);
    expect(store.getMotionPreferenceSnapshot()).toEqual({
      mode: "still",
      preference: "system",
      systemReducedMotion: true,
    });
    expect(browser.documentElement.dataset).toMatchObject({
      motionMode: "still",
      motionPreference: "system",
    });

    browser.emitMediaChange(false);
    expect(store.getMotionPreferenceSnapshot().mode).toBe("full");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps an explicit override when the device preference changes", async () => {
    const browser = installFakeBrowser({ reducedMotion: true });
    const store = await loadStore();
    store.subscribeToMotionPreference(vi.fn());

    store.setStoredMotionPreference("calm");
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "calm",
      preference: "calm",
      systemReducedMotion: true,
    });

    browser.emitMediaChange(false);
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "calm",
      preference: "calm",
      systemReducedMotion: false,
    });
    browser.emitMediaChange(true);
    expect(store.getMotionPreferenceSnapshot().mode).toBe("calm");
  });

  it("persists explicit choices and removes storage for Device", async () => {
    const browser = installFakeBrowser({ reducedMotion: true });
    const store = await loadStore();

    store.setStoredMotionPreference("full");
    expect(browser.localStorage.setItem).toHaveBeenCalledWith(
      MOTION_STORAGE_KEY,
      "full",
    );
    expect(store.getMotionPreferenceSnapshot().mode).toBe("full");

    store.setStoredMotionPreference("system");
    expect(browser.localStorage.removeItem).toHaveBeenCalledWith(
      MOTION_STORAGE_KEY,
    );
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "still",
      preference: "system",
    });
  });

  it("applies in-memory choices when storage reads and writes throw", async () => {
    const browser = installFakeBrowser({
      reducedMotion: true,
      throwOnRead: true,
      throwOnWrite: true,
    });
    const store = await loadStore();

    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "still",
      preference: "system",
    });
    expect(() => store.setStoredMotionPreference("full")).not.toThrow();
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "full",
      preference: "full",
    });
    expect(browser.documentElement.dataset.motionMode).toBe("full");
  });

  it("updates from relevant cross-tab storage events only", async () => {
    const browser = installFakeBrowser({ initialPreference: "full" });
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribeToMotionPreference(listener);

    browser.storage.set(MOTION_STORAGE_KEY, "still");
    browser.emitStorage("another.preference");
    expect(store.getMotionPreferenceSnapshot().mode).toBe("full");
    expect(listener).not.toHaveBeenCalled();

    browser.emitStorage();
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "still",
      preference: "still",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    browser.storage.delete(MOTION_STORAGE_KEY);
    browser.emitStorage(null);
    expect(store.getMotionPreferenceSnapshot()).toMatchObject({
      mode: "full",
      preference: "system",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps snapshot identity stable and does not notify for no-op events", async () => {
    const browser = installFakeBrowser();
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribeToMotionPreference(listener);
    const initial = store.getMotionPreferenceSnapshot();

    expect(store.getMotionPreferenceSnapshot()).toBe(initial);
    browser.emitMediaChange(false);
    expect(store.getMotionPreferenceSnapshot()).toBe(initial);
    browser.emitStorage();
    expect(store.getMotionPreferenceSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
    expect(browser.documentElement.dataset).toMatchObject({
      motionMode: "full",
      motionPreference: "system",
    });
  });
});

describe("motion preference bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the pre-hydration root mode from the saved explicit preference", () => {
    const browser = installFakeBrowser({
      initialPreference: "calm",
      reducedMotion: true,
    });

    runInNewContext(MOTION_PREFERENCE_BOOTSTRAP_SCRIPT, {
      document,
      window,
    });

    expect(browser.documentElement.dataset).toEqual({
      motionMode: "calm",
      motionPreference: "calm",
    });
  });

  it("falls back safely to the device preference when storage throws", () => {
    const browser = installFakeBrowser({
      reducedMotion: true,
      throwOnRead: true,
    });

    expect(() =>
      runInNewContext(MOTION_PREFERENCE_BOOTSTRAP_SCRIPT, { document, window }),
    ).not.toThrow();
    expect(browser.documentElement.dataset).toEqual({
      motionMode: "still",
      motionPreference: "system",
    });
  });
});
