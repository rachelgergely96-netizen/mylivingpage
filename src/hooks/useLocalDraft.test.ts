import { describe, expect, it, vi } from "vitest";
import {
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
});
