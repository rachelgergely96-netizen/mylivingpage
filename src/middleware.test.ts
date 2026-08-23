import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { isEditorPreviewEnabled, updateSession } = vi.hoisted(() => ({
  isEditorPreviewEnabled: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("@/lib/editor-preview", () => ({ isEditorPreviewEnabled }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession }));

import { middleware } from "@/middleware";

describe("local preview middleware", () => {
  beforeEach(() => {
    isEditorPreviewEnabled.mockReset();
    updateSession.mockReset();
  });

  it("returns 404 for the public action preview when previews are disabled", async () => {
    isEditorPreviewEnabled.mockReturnValue(false);

    const response = await middleware(
      new NextRequest("https://example.com/dev/public-action-preview"),
    );

    expect(response.status).toBe(404);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("allows the public action preview without starting an auth session", async () => {
    isEditorPreviewEnabled.mockReturnValue(true);

    const response = await middleware(
      new NextRequest("https://example.com/dev/public-action-preview"),
    );

    expect(response.status).toBe(200);
    expect(updateSession).not.toHaveBeenCalled();
  });
});
