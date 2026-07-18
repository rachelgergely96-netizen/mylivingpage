import { describe, expect, it, vi } from "vitest";
import {
  clearLocalDraftStorage,
  loadDraftEnvelope,
  persistDraftEnvelope,
  removeDraftEnvelope,
} from "@/hooks/useLocalDraft";

describe("useLocalDraft storage helpers", () => {
  it("does not read storage when the draft key is unresolved", () => {
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const draft = loadDraftEnvelope(storage, null);

    expect(draft).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("reads only the matching scoped draft key", () => {
    const envelope = {
      data: { resumeText: "Scoped draft" },
      savedAt: 123,
    };
    const storage = {
      getItem: vi.fn((key: string) => (key === "scoped-key" ? JSON.stringify(envelope) : null)),
      removeItem: vi.fn(),
    };

    const draft = loadDraftEnvelope<{ resumeText: string }>(storage, "scoped-key");

    expect(draft).toEqual(envelope);
    expect(storage.getItem).toHaveBeenCalledWith("scoped-key");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("does not write or remove storage when the draft key is unresolved", () => {
    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    persistDraftEnvelope(storage, null, {
      data: { resumeText: "Ignored" },
      savedAt: 999,
    });
    removeDraftEnvelope(storage, null);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("does not throw when a draft cannot be removed from browser storage", () => {
    const storage = {
      removeItem: vi.fn(() => {
        throw new Error("Storage is unavailable");
      }),
    };

    expect(() => removeDraftEnvelope(storage, "mlp-draft-create-user-123")).not.toThrow();
  });

  it("does not throw when a corrupt draft cannot be cleaned up", () => {
    const storage = {
      getItem: vi.fn(() => "not-json"),
      removeItem: vi.fn(() => {
        throw new Error("Storage is unavailable");
      }),
    };

    expect(() => loadDraftEnvelope(storage, "mlp-draft-create-user-123")).not.toThrow();
    expect(loadDraftEnvelope(storage, "mlp-draft-create-user-123")).toBeNull();
  });

  it("clears MyLivingPage drafts without removing consent or unrelated preferences", () => {
    const keys = [
      "mlp-draft-create-user-123",
      "analytics-consent",
      "mlp-draft-edit-page-456-living-page",
      "theme-preference",
    ];
    const removeItem = vi.fn();
    const storage = {
      get length() {
        return keys.length;
      },
      key: vi.fn((index: number) => keys[index] ?? null),
      removeItem,
    };

    clearLocalDraftStorage(storage);

    expect(removeItem).toHaveBeenCalledTimes(2);
    expect(removeItem).toHaveBeenCalledWith("mlp-draft-create-user-123");
    expect(removeItem).toHaveBeenCalledWith("mlp-draft-edit-page-456-living-page");
    expect(removeItem).not.toHaveBeenCalledWith("analytics-consent");
    expect(removeItem).not.toHaveBeenCalledWith("theme-preference");
  });

  it("does not interrupt sign-out when browser storage cannot be inspected", () => {
    const storage = {
      get length(): number {
        throw new Error("Storage is unavailable");
      },
      key: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(() => clearLocalDraftStorage(storage)).not.toThrow();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
