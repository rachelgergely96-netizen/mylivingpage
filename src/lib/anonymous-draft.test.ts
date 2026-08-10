import { beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_CREATE_DRAFT_KEY,
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
    saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" });

    expect(readAnonymousCreateDraft<{ resumeText: string }>()?.data).toEqual({
      resumeText: "Dana Whitfield",
    });
  });

  it("moves the draft onto the signed-in key and clears the anonymous one", () => {
    saveAnonymousCreateDraft({ resumeText: "Dana Whitfield" });

    expect(claimAnonymousCreateDraft<{ resumeText: string }>(USER_KEY)).toBe(true);
    expect(readAnonymousCreateDraft()).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem(USER_KEY) ?? "null").data,
    ).toEqual({ resumeText: "Dana Whitfield" });
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

  it("discards on request", () => {
    saveAnonymousCreateDraft({ resumeText: "Dana" });
    discardAnonymousCreateDraft();

    expect(readAnonymousCreateDraft()).toBeNull();
  });

  it("stays in the mlp-draft namespace so the sign-out sweep clears it", () => {
    expect(ANONYMOUS_CREATE_DRAFT_KEY.startsWith("mlp-draft-")).toBe(true);
  });
});
