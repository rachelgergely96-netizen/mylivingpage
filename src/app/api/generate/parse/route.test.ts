import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  getUser: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: mocks.anthropicCreate,
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => mocks.serviceRoleFactory()),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/generate/parse/route";
import { getAnthropicClient } from "@/lib/anthropic";

describe("POST /api/generate/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({ count: 0 }),
            })),
          })),
        })),
      })),
    });
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.anthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "Taylor Reed",
            headline: "Product Manager",
            location: "Austin, TX",
            email: "taylor@example.com",
            linkedin: "linkedin.com/in/taylorreed",
            github: null,
            website: null,
            summary: "Product manager building B2B software.",
            experience: [],
            education: [],
            projects: [],
            skills: [{ category: "Core", items: ["SQL"] }],
            certifications: [],
            stats: [],
          }),
        },
      ],
    });
  });

  it("returns a clean JSON error when parsing cannot start", async () => {
    mocks.serviceRoleFactory.mockImplementation(() => {
      throw new Error("Missing SUPABASE_SECRET_KEY");
    });

    const response = await POST(
      new Request("http://localhost/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: "Taylor Reed\nProduct Manager",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Resume parsing is temporarily unavailable right now. Continue manually or try again later.",
      code: "config_unavailable",
      retryable: false,
    });
  });

  it("streams a structured SSE error when parsing fails after the stream starts", async () => {
    mocks.anthropicCreate.mockRejectedValueOnce(new Error("Claude upstream timeout"));

    const response = await POST(
      new Request("http://localhost/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: "Taylor Reed\nProduct Manager",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();

    expect(body).toContain('"type":"error"');
    expect(body).toContain('"code":"model_upstream"');
    expect(body).toContain('"retryable":true');
    expect(body).toContain("The AI parser timed out before it finished. Try again in a moment.");
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "resume.parse.failed",
      expect.objectContaining({
        error: "Claude upstream timeout",
        error_code: "model_upstream",
      }),
    );
  });

  it("preflights Anthropic availability before starting the stream", async () => {
    vi.mocked(getAnthropicClient).mockImplementationOnce(() => {
      throw new Error("Missing ANTHROPIC_API_KEY");
    });

    const response = await POST(
      new Request("http://localhost/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: "Taylor Reed\nProduct Manager",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Resume parsing is temporarily unavailable right now. Continue manually or try again later.",
      code: "config_unavailable",
      retryable: false,
    });
  });

  it("streams a structured validation failure when Anthropic returns malformed JSON", async () => {
    mocks.anthropicCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: '{"name":"Taylor Reed","headline":"Product Manager"',
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: "Taylor Reed\nProduct Manager",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();

    expect(body).toContain('"code":"invalid_json"');
    expect(body).toContain('"retryable":true');
    expect(body).toContain("The AI parser returned malformed output. Try again in a moment.");
  });

  it("normalizes non-string education years instead of failing the whole resume", async () => {
    mocks.anthropicCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "Rachel Gergely",
            headline: "Founder | Attorney | Product Architect",
            location: "New York City & Orlando, Florida",
            email: "rachel@example.com",
            linkedin: "linkedin.com/in/rachel-gergely-75ba86105",
            github: null,
            website: null,
            summary: "Product-focused founder and attorney building systems.",
            experience: [],
            education: [
              { degree: "J.D.", school: "Law School", year: 2026 },
              { degree: "B.A.", school: "University", year: null },
            ],
            projects: [],
            skills: [{ category: "Core", items: "Product strategy" }],
            certifications: [],
            stats: [],
          }),
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: "Rachel Gergely\nFounder | Attorney | Product Architect",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();

    expect(body).toContain('"type":"result"');
    expect(body).toContain('"year":"2026"');
    expect(body).toContain('"year":""');
    expect(body).toContain('"items":["Product strategy"]');
    expect(body).not.toContain('"type":"error"');
  });
});
