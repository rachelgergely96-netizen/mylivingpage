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

import { DELETE, POST } from "@/app/api/avatar/route";

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

  it("accepts a valid image at the 2 MB file limit", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const formData = new FormData();
    formData.set(
      "file",
      new File([bytes], "avatar.png", { type: "image/png" }),
    );

    const response = await POST(new Request("http://localhost/api/avatar", {
      method: "POST",
      body: formData,
    }));

    expect(response.status).toBe(200);
    expect(mocks.storageUpload).toHaveBeenCalledOnce();
  });

  it("rejects a headerless oversized multipart body before storage access", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "avatar.png",
        { type: "image/png" },
      ),
    );
    formData.set("padding", "x".repeat(2 * 1024 * 1024 + 128 * 1024));
    const request = new Request("http://localhost/api/avatar", {
      method: "POST",
      body: formData,
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "File must be under 2 MB.",
    });
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
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

describe("DELETE /api/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mocks.storageList.mockResolvedValue({ data: priorObjects, error: null });
    mocks.storageRemove.mockResolvedValue({ error: null });
    mocks.profileUpdate.mockReturnValue({ eq: mocks.profileEq });
    mocks.profileEq.mockReturnValue({ select: mocks.profileSelect });
    mocks.profileSelect.mockReturnValue({ maybeSingle: mocks.profileMaybeSingle });
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("reports success after the profile is cleared even if object cleanup fails", async () => {
    mocks.storageRemove.mockResolvedValueOnce({
      error: { message: "storage unavailable" },
    });

    const response = await DELETE();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.profileUpdate).toHaveBeenCalledWith({ avatar_url: null });
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "avatar.cleanup.failed",
      expect.objectContaining({ stage: "storage-cleanup" }),
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith("user-1", "avatar.remove");
  });

  it("does not delete objects when clearing the profile fails", async () => {
    mocks.profileMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "profile unavailable" },
    });

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });
});
