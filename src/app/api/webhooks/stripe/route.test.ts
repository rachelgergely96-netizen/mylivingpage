import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  createSupabaseBillingRepository: vi.fn(),
  getStripe: vi.fn(),
  operations: [] as string[],
  processStripeWebhookEvent: vi.fn(),
  recordLegalAcceptance: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mocks.getStripe(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: () =>
    mocks.createServiceRoleSupabaseClient(),
}));

vi.mock("@/lib/billing/stripeWebhook", () => ({
  createSupabaseBillingRepository: (...args: unknown[]) =>
    mocks.createSupabaseBillingRepository(...args),
  processStripeWebhookEvent: (...args: unknown[]) =>
    mocks.processStripeWebhookEvent(...args),
}));

vi.mock("@/lib/legal/acceptance", () => ({
  recordLegalAcceptance: (...args: unknown[]) =>
    mocks.recordLegalAcceptance(...args),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const STRIPE_WEBHOOK_BODY_LIMIT_BYTES = 65_536;
const STRIPE_SIGNATURE_HEADER_LIMIT = 8 * 1024;

const verifiedEvent = {
  id: "evt_verified",
  type: "customer.subscription.updated",
  created: 1_788_000_000,
  data: { object: { id: "sub_verified" } },
};

function webhookRequest(
  body: string,
  signature?: string,
  headers: Record<string, string> = {},
) {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      ...(signature ? { "stripe-signature": signature } : {}),
      ...headers,
    },
    body,
  });
}

function expectNoUnverifiedWrites() {
  expect(mocks.createServiceRoleSupabaseClient).not.toHaveBeenCalled();
  expect(mocks.createSupabaseBillingRepository).not.toHaveBeenCalled();
  expect(mocks.processStripeWebhookEvent).not.toHaveBeenCalled();
  expect(mocks.recordLegalAcceptance).not.toHaveBeenCalled();
  expect(mocks.trackEvent).not.toHaveBeenCalled();
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.operations.length = 0;
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    mocks.getStripe.mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
    });
    mocks.constructEvent.mockReturnValue(verifiedEvent);
    mocks.createServiceRoleSupabaseClient.mockImplementation(() => {
      mocks.operations.push("database");
      return { kind: "service-client" };
    });
    mocks.createSupabaseBillingRepository.mockImplementation(() => {
      mocks.operations.push("repository");
      return { kind: "billing-repository" };
    });
    mocks.processStripeWebhookEvent.mockImplementation(async () => {
      mocks.operations.push("process");
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a missing signature without verification, analytics, or DB access", async () => {
    const response = await POST(webhookRequest("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook request rejected.",
    });
    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expectNoUnverifiedWrites();
  });

  it("rejects an oversized signature before reading or verifying the body", async () => {
    const response = await POST(
      webhookRequest("{}", "x".repeat(STRIPE_SIGNATURE_HEADER_LIMIT + 1)),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook request rejected.",
    });
    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expectNoUnverifiedWrites();
  });

  it("rejects a headerless oversized body before verification or DB access", async () => {
    const request = webhookRequest(
      "x".repeat(STRIPE_WEBHOOK_BODY_LIMIT_BYTES + 1),
      "t=1788000000,v1=signature",
    );
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook request rejected.",
    });
    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expectNoUnverifiedWrites();
  });

  it("keeps an invalid signature failure generic and write-free", async () => {
    mocks.constructEvent.mockImplementationOnce(() => {
      throw new Error("sensitive verifier detail".repeat(100));
    });

    const response = await POST(
      webhookRequest('{"id":"evt_invalid"}', "t=1788000000,v1=invalid"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook request rejected.",
    });
    expect(mocks.constructEvent).toHaveBeenCalledOnce();
    expectNoUnverifiedWrites();
  });

  it("verifies the exact raw body before initializing persistence", async () => {
    const rawPayload = '{\n  "id": "evt_verified",\n  "data": { "value": "José" }\n}\n';
    mocks.constructEvent.mockImplementation((...args: unknown[]) => {
      mocks.operations.push("verify");
      expect(args).toEqual([
        rawPayload,
        "t=1788000000,v1=valid",
        "whsec_test",
      ]);
      return verifiedEvent;
    });

    const response = await POST(
      webhookRequest(rawPayload, "t=1788000000,v1=valid"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.operations).toEqual([
      "verify",
      "database",
      "repository",
      "process",
    ]);
    expect(mocks.processStripeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: verifiedEvent,
        repository: { kind: "billing-repository" },
        recordLegalAcceptance: expect.any(Function),
        trackEvent: expect.any(Function),
        processedAt: expect.any(Date),
      }),
    );
  });
});
