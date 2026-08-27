import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  insert: vi.fn(),
}));

const consoleErrorSpy = vi
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() =>
    mocks.createServiceRoleSupabaseClient(),
  ),
}));

import { POST } from "@/app/api/waitlist/route";

function createServiceRoleClient(options?: {
  insertError?: { code?: string; message: string } | null;
}) {
  return {
    from(table: string) {
      if (table === "waitlist") {
        return {
          insert(values: Record<string, unknown>) {
            mocks.insert(values);
            return Promise.resolve({ error: options?.insertError ?? null });
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildRawRequest(body: string) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns the rate-limit response when the limit is exceeded", async () => {
    mocks.enforceRateLimit.mockResolvedValueOnce({
      limited: true,
      response: Response.json({ error: "Too many requests." }, { status: 429 }),
    });

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(429);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("fails closed when rate-limit persistence is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Waitlist signup is temporarily unavailable.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", async () => {
    const response = await POST(buildRequest({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please provide a valid email address.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each(["{", "null", "[]", '"rachel@example.com"'])(
    "rejects an invalid request body: %s",
    async (body) => {
      const response = await POST(buildRawRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Invalid request payload.",
      });
      expect(mocks.insert).not.toHaveBeenCalled();
    },
  );

  it("reports provider construction failures as service errors", async () => {
    mocks.createServiceRoleSupabaseClient.mockImplementationOnce(() => {
      throw new Error("service configuration unavailable");
    });

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to join the waitlist right now.",
    });
  });

  it("stores a normalized email and confirms the signup", async () => {
    const response = await POST(
      buildRequest({ email: "  Rachel@Example.COM  ", referralCode: "  FRIEND " }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "You are in. We will email launch updates soon.",
    });
    expect(mocks.insert).toHaveBeenCalledWith({
      email: "rachel@example.com",
      referral_code: "FRIEND",
    });
  });

  it("treats a unique-constraint conflict as an idempotent success", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        insertError: { code: "23505", message: "duplicate key" },
      }),
    );

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "You are already on the waitlist.",
    });
  });

  it("returns 500 when the insert fails for another reason", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        insertError: { code: "500", message: "insert failed" },
      }),
    );

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to join the waitlist right now.",
    });
  });
});
