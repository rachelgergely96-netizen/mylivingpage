import { describe, expect, it } from "vitest";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

describe("editor preview gate", () => {
  it("requires an explicit local or CI opt-in", () => {
    expect(isEditorPreviewEnabled({})).toBe(false);
    expect(isEditorPreviewEnabled({ ENABLE_EDITOR_PREVIEW: "0" })).toBe(false);
    expect(isEditorPreviewEnabled({ ENABLE_EDITOR_PREVIEW: "1" })).toBe(true);
  });

  it("always stays disabled on Vercel", () => {
    expect(
      isEditorPreviewEnabled({ ENABLE_EDITOR_PREVIEW: "1", VERCEL: "1" }),
    ).toBe(false);
  });

  it("stays disabled on non-CI production servers", () => {
    expect(
      isEditorPreviewEnabled({
        ENABLE_EDITOR_PREVIEW: "1",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isEditorPreviewEnabled({
        CI: "1",
        ENABLE_EDITOR_PREVIEW: "1",
        NODE_ENV: "production",
      }),
    ).toBe(true);
  });
});
