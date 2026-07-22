import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ updateSession: vi.fn(), isAdminEmail: vi.fn(), previewEnabled: vi.fn() }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: mocks.updateSession }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: mocks.isAdminEmail }));
vi.mock("@/lib/editor-preview", () => ({ isEditorPreviewEnabled: mocks.previewEnabled }));

import { middleware } from "@/middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: "user-1",
      userEmail: "person@example.com",
    });
    mocks.isAdminEmail.mockReturnValue(false);
    mocks.previewEnabled.mockReturnValue(false);
  });

  it("redirects signed-out users to login with the protected path", async () => {
    mocks.updateSession.mockResolvedValue({ response: NextResponse.next(), userId: null, userEmail: null });
    const response = await middleware(new NextRequest("https://www.mylivingpage.com/dashboard/settings"));
    expect(response.headers.get("location")).toBe("https://www.mylivingpage.com/login?next=%2Fdashboard%2Fsettings");
  });

  it("redirects non-admin users away from admin pages", async () => {
    const response = await middleware(new NextRequest("https://www.mylivingpage.com/admin/users"));
    expect(response.headers.get("location")).toBe("https://www.mylivingpage.com/dashboard");
  });

  it("passes authenticated product requests through", async () => {
    const response = await middleware(new NextRequest("https://www.mylivingpage.com/create"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps local preview routes disabled unless explicitly enabled", async () => {
    const hidden = await middleware(new NextRequest("https://www.mylivingpage.com/dev/theme-lab"));
    expect(hidden.status).toBe(404);
    mocks.previewEnabled.mockReturnValue(true);
    const visible = await middleware(new NextRequest("https://www.mylivingpage.com/dev/theme-lab"));
    expect(visible.headers.get("x-middleware-next")).toBe("1");
  });
});
