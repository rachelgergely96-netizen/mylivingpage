import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCustomer: vi.fn(),
  serviceRoleFactory: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    customers = { create: mocks.createCustomer };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: () => mocks.serviceRoleFactory(),
}));

import { getOrCreateStripeCustomer } from "@/lib/stripe";

type ProfileResult = {
  data: { stripe_customer_id: string | null } | null;
  error: { message: string } | null;
};

function makeSupabase(options: {
  profile: ProfileResult;
  persisted?: ProfileResult;
}) {
  const profileSingle = vi.fn().mockResolvedValue(options.profile);
  const persistedSingle = vi.fn().mockResolvedValue(
    options.persisted ?? {
      data: { stripe_customer_id: "cus_new" },
      error: null,
    },
  );
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: persistedSingle })),
    })),
  }));

  return {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: profileSingle })),
        })),
        update,
      })),
    },
    update,
  };
}

describe("getOrCreateStripeCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
    mocks.createCustomer.mockResolvedValue({ id: "cus_new" });
  });

  it("returns the persisted customer without creating another one", async () => {
    const supabase = makeSupabase({
      profile: {
        data: { stripe_customer_id: "cus_existing" },
        error: null,
      },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).resolves.toBe("cus_existing");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("fails closed when the billing profile cannot be read", async () => {
    const supabase = makeSupabase({
      profile: { data: null, error: { message: "database offline" } },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).rejects.toThrow("Could not load the billing profile");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("does not create a customer when the profile is unexpectedly absent", async () => {
    const supabase = makeSupabase({
      profile: { data: null, error: null },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).rejects.toThrow("Could not load the billing profile");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("uses a stable idempotency key and verifies persistence", async () => {
    const supabase = makeSupabase({
      profile: { data: { stripe_customer_id: null }, error: null },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).resolves.toBe("cus_new");
    expect(mocks.createCustomer).toHaveBeenCalledWith(
      {
        email: "rachel@example.com",
        metadata: { supabase_user_id: "user-1" },
      },
      { idempotencyKey: "living-page-customer:user-1" },
    );
    expect(supabase.update).toHaveBeenCalledWith({
      stripe_customer_id: "cus_new",
    });
  });

  it("does not report success when the customer ID cannot be persisted", async () => {
    const supabase = makeSupabase({
      profile: { data: { stripe_customer_id: null }, error: null },
      persisted: {
        data: null,
        error: { message: "write unavailable" },
      },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).rejects.toThrow("Could not save the billing customer");
  });

  it("rejects a persistence response that does not contain the new ID", async () => {
    const supabase = makeSupabase({
      profile: { data: { stripe_customer_id: null }, error: null },
      persisted: {
        data: { stripe_customer_id: "cus_other" },
        error: null,
      },
    });
    mocks.serviceRoleFactory.mockReturnValue(supabase.client);

    await expect(
      getOrCreateStripeCustomer("user-1", "rachel@example.com"),
    ).rejects.toThrow("Could not save the billing customer");
  });
});
