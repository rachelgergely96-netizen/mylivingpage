import { beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_CREATE_DRAFT_KEY,
  ANONYMOUS_CREATE_DRAFT_TTL_MS,
  claimAnonymousCreateDraft,
  discardAnonymousCreateDraft,
  readAnonymousCreateDraft,
  saveAnonymousCreateDraft,
} from "@/lib/anonymous-draft";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
  };

  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });

  return storage;
}

const USER_KEY = "mlp-draft-create-user-1";

describe("anonymous create draft", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("round-trips a pre-signup draft", () => {
    expect(saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" })).toBe(true);

    expect(readAnonymousCreateDraft<{ resumeText: string }>()?.data).toEqual({
      resumeText: "Dana Whitfield",
    });
  });

  it("reports a blocked pre-signup draft write", () => {
    const storage = window.localStorage;
    const originalSetItem = storage.setItem;

    try {
      storage.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
      expect(saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" })).toBe(false);
      expect(readAnonymousCreateDraft()).toBeNull();
    } finally {
      storage.setItem = originalSetItem;
    }
  });

  it("moves the draft onto the signed-in key and clears the anonymous one", () => {
    saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" });

    expect(claimAnonymousCreateDraft<{ resumeText: string }>(USER_KEY)).toBe(true);
    expect(readAnonymousCreateDraft()).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem(USER_KEY) ?? "null").data,
    ).toEqual({ resumeText: "Dana Whitfield" });
  });

  it("keeps the anonymous source when the user-scoped write is blocked", () => {
    const storage = window.localStorage;
    expect(saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" })).toBe(true);
    const originalSetItem = storage.setItem;
    storage.setItem = (key: string, value: string) => {
      if (key === USER_KEY) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      originalSetItem(key, value);
    };

    expect(claimAnonymousCreateDraft<{ resumeText: string }>(USER_KEY)).toBe(false);
    expect(storage.getItem(USER_KEY)).toBeNull();
    expect(readAnonymousCreateDraft<{ resumeText: string }>()?.data).toEqual({
      resumeText: "Dana Whitfield",
    });
  });

  it("never overwrites work already in progress on the account", () => {
    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify({ data: { resumeText: "existing work" }, savedAt: 1 }),
    );
    saveAnonymousCreateDraft({ resumeText: "pasted on the marketing page" });

    expect(claimAnonymousCreateDraft<{ resumeText: string }>(USER_KEY)).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem(USER_KEY) ?? "null").data,
    ).toEqual({ resumeText: "existing work" });
    // The unclaimed draft is still cleared, so it cannot resurface later.
    expect(readAnonymousCreateDraft()).toBeNull();
  });

  it("does nothing when there is no pre-signup draft", () => {
    expect(claimAnonymousCreateDraft(USER_KEY)).toBe(false);
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("refuses a stale draft rather than handing it to whoever signs in next", () => {
    // No account exists when this is written, so the key cannot be scoped to
    // one. On a shared machine the age check is what stops the next person
    // inheriting the last visitor's résumé.
    window.localStorage.setItem(
      ANONYMOUS_CREATE_DRAFT_KEY,
      JSON.stringify({
        data: { resumeText: "someone else's résumé" },
        savedAt: Date.now() - ANONYMOUS_CREATE_DRAFT_TTL_MS - 1000,
      }),
    );

    expect(claimAnonymousCreateDraft(USER_KEY)).toBe(false);
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
    // And it is cleared, so it cannot be inherited later either.
    expect(readAnonymousCreateDraft()).toBeNull();
  });

  it("claims a draft still inside the window", () => {
    window.localStorage.setItem(
      ANONYMOUS_CREATE_DRAFT_KEY,
      JSON.stringify({
        data: { resumeText: "still mine" },
        savedAt: Date.now() - 60_000,
      }),
    );

    expect(claimAnonymousCreateDraft(USER_KEY)).toBe(true);
  });

  it("discards a draft with a nonsense timestamp", () => {
    window.localStorage.setItem(
      ANONYMOUS_CREATE_DRAFT_KEY,
      JSON.stringify({ data: { resumeText: "x" }, savedAt: "not-a-number" }),
    );

    expect(claimAnonymousCreateDraft(USER_KEY)).toBe(false);
    expect(readAnonymousCreateDraft()).toBeNull();
  });

  it("discards on request", () => {
    saveAnonymousCreateDraft({ resumeText: "Dana" });
    discardAnonymousCreateDraft();

    expect(readAnonymousCreateDraft()).toBeNull();
  });

  it("stays in the mlp-draft namespace so the sign-out sweep clears it", () => {
    expect(ANONYMOUS_CREATE_DRAFT_KEY.startsWith("mlp-draft-")).toBe(true);
  });
});
