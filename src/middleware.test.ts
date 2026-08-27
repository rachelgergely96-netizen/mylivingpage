import { NextRequest, NextResponse } from "next/server";
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

  it("preserves a protected deep link when redirecting to sign in", async () => {
    isEditorPreviewEnabled.mockReturnValue(false);
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: null,
      userEmail: null,
    });

    const response = await middleware(
      new NextRequest(
        "https://example.com/dashboard/settings?panel=visibility&source=reminder",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/login?next=%2Fdashboard%2Fsettings%3Fpanel%3Dvisibility%26source%3Dreminder",
    );
  });

  it("preserves create-flow attribution through sign in", async () => {
    isEditorPreviewEnabled.mockReturnValue(false);
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: null,
      userEmail: null,
    });

    const response = await middleware(
      new NextRequest("https://example.com/create?ref=resume_preview"),
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/login?next=%2Fcreate%3Fref%3Dresume_preview",
    );
  });

  it("leaves an authenticated protected deep link untouched", async () => {
    isEditorPreviewEnabled.mockReturnValue(false);
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: "user-1",
      userEmail: "user@example.com",
    });

    const response = await middleware(
      new NextRequest(
        "https://example.com/dashboard/analytics/page-1?range=90d",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
