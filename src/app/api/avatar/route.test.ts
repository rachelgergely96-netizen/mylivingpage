import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  operations: [] as string[],
  profileEq: vi.fn(),
  profileMaybeSingle: vi.fn(),
  profileSelect: vi.fn(),
  profileUpdate: vi.fn(),
  storageGetPublicUrl: vi.fn(),
  storageList: vi.fn(),
  storageRemove: vi.fn(),
  storageUpload: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: mocks.storageGetPublicUrl,
        list: mocks.storageList,
        remove: mocks.storageRemove,
        upload: mocks.storageUpload,
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return { update: mocks.profileUpdate };
    }),
  })),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/avatar/route";

const priorObjects = [
  { name: "headshot-old" },
  { name: "legacy-avatar.png" },
];

function avatarRequest() {
  const formData = new FormData();
  formData.set(
    "file",
    new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "avatar.png",
      { type: "image/png" },
    ),
  );

  return new Request("http://localhost/api/avatar", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.operations.length = 0;

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mocks.storageList.mockResolvedValue({
      data: priorObjects,
      error: null,
    });
    mocks.storageUpload.mockImplementation(async (path: string) => {
      mocks.operations.push(`upload:${path}`);
      return { error: null };
    });
    mocks.storageGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://assets.example/${path}` },
    }));
    mocks.storageRemove.mockImplementation(async (paths: string[]) => {
      mocks.operations.push(`remove:${paths.join(",")}`);
      return { error: null };
    });
    mocks.profileUpdate.mockImplementation((values: Record<string, unknown>) => {
      mocks.operations.push(`profile-update:${String(values.avatar_url)}`);
      return { eq: mocks.profileEq };
    });
    mocks.profileEq.mockReturnValue({ select: mocks.profileSelect });
    mocks.profileSelect.mockReturnValue({ maybeSingle: mocks.profileMaybeSingle });
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("uploads a unique replacement, updates the profile, then removes only prior objects", async () => {
    const response = await POST(avatarRequest());

    expect(response.status).toBe(200);
    expect(mocks.storageUpload).toHaveBeenCalledOnce();

    const uploadedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(uploadedPath).toMatch(/^user-1\/headshot-[0-9a-f-]+$/i);
    expect(priorObjects.map(({ name }) => `user-1/${name}`)).not.toContain(
      uploadedPath,
    );
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      avatar_url: expect.stringContaining(`https://assets.example/${uploadedPath}?t=`),
    });
    expect(mocks.storageRemove).toHaveBeenCalledOnce();
    expect(mocks.storageRemove).toHaveBeenCalledWith([
      "user-1/headshot-old",
      "user-1/legacy-avatar.png",
    ]);
    expect(mocks.operations.map((operation) => operation.split(":")[0])).toEqual([
      "upload",
      "profile-update",
      "remove",
    ]);
  });

  it("removes only the new object when the profile update fails", async () => {
    mocks.profileMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "profile update failed" },
    });

    const response = await POST(avatarRequest());

    expect(response.status).toBe(500);
    const uploadedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(mocks.storageRemove).toHaveBeenCalledOnce();
    expect(mocks.storageRemove).toHaveBeenCalledWith([uploadedPath]);
    expect(mocks.storageRemove).not.toHaveBeenCalledWith([
      "user-1/headshot-old",
      "user-1/legacy-avatar.png",
    ]);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "avatar.upload.failed",
      expect.objectContaining({ stage: "profile-update" }),
    );
  });
});
