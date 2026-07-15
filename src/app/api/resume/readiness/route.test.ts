import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkResumeExport: vi.fn(),
  coerceResumeDataForExport: vi.fn(),
  enforceRateLimit: vi.fn(),
  evaluateAtsReadiness: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/ats-readiness", () => ({
  evaluateAtsReadiness: mocks.evaluateAtsReadiness,
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  checkResumeExport: mocks.checkResumeExport,
}));

vi.mock("@/lib/resume-export", () => ({
  coerceResumeDataForExport: mocks.coerceResumeDataForExport,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { POST } from "@/app/api/resume/readiness/route";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

function buildResumeData(): ResumeData {
  return {
    name: "Taylor Reed",
    headline: "Product Manager",
    location: "Austin, TX",
    email: "taylor@example.com",
    linkedin: "linkedin.com/in/taylor",
    github: "github.com/taylor",
    website: "taylor.dev",
    avatar_url: null,
    summary: "Product manager shipping B2B software.",
    experience: [
      {
        title: "Product Manager",
        company: "Acme",
        dates: "2023 - Present",
        highlights: ["Increased activation by 24%."],
        url: null,
      },
    ],
    education: [],
    projects: [],
    skills: [{ category: "Skills", items: ["Roadmaps", "Analytics"] }],
    certifications: [],
    stats: [],
  };
}

function createRequest(body: unknown = { resumeData: buildResumeData() }) {
  return new Request("http://localhost/api/resume/readiness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/resume/readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: { user: { id: "user-1" } },
    });
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 59,
      resetAt: "2026-07-15T16:10:00.000Z",
    });
    mocks.coerceResumeDataForExport.mockImplementation((value) => value);
    mocks.checkResumeExport.mockResolvedValue({
      renderable: true,
      renderFailureReason: null,
      pageCount: 1,
      fitsOnOnePage: true,
      overflowReasons: [],
      recommendedFixes: [],
    } satisfies AtsExportCheck);
    mocks.evaluateAtsReadiness.mockReturnValue({
      status: "ready",
      score: 100,
    });
  });

  it("requires an authenticated user before reading or evaluating the resume", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.checkResumeExport).not.toHaveBeenCalled();
    expect(mocks.evaluateAtsReadiness).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/resume/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON request body.",
    });
    expect(mocks.evaluateAtsReadiness).not.toHaveBeenCalled();
  });

  it.each([
    [null, "resumeData must be an object."],
    [{}, "resumeData must be an object."],
    [{ resumeData: [] }, "resumeData must be an object."],
    [{ resumeData: "resume" }, "resumeData must be an object."],
    [
      { resumeData: {}, targetTitle: 42 },
      "targetTitle must be a string.",
    ],
    [
      { resumeData: {}, jobDescription: ["role"] },
      "jobDescription must be a string.",
    ],
  ])("rejects malformed request bodies", async (body, expectedError) => {
    const response = await POST(createRequest(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: expectedError });
    expect(mocks.checkResumeExport).not.toHaveBeenCalled();
  });

  it("rejects oversized comparison text", async () => {
    const titleResponse = await POST(
      createRequest({
        resumeData: {},
        targetTitle: "T".repeat(161),
      }),
    );
    expect(titleResponse.status).toBe(400);
    await expect(titleResponse.json()).resolves.toEqual({
      error: "targetTitle must be 160 characters or fewer.",
    });

    const descriptionResponse = await POST(
      createRequest({
        resumeData: {},
        jobDescription: "D".repeat(20_001),
      }),
    );
    expect(descriptionResponse.status).toBe(400);
    await expect(descriptionResponse.json()).resolves.toEqual({
      error: "jobDescription must be 20,000 characters or fewer.",
    });
    expect(mocks.evaluateAtsReadiness).not.toHaveBeenCalled();
  });

  it("returns the existing user-scoped rate-limit response", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      limited: true,
      response: Response.json(
        { error: "Too many resume validation requests.", resetAt: "later" },
        { status: 429 },
      ),
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many resume validation requests.",
      resetAt: "later",
    });
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith({
      request: expect.any(Request),
      policy: "ats_export_check",
      route: "/api/resume/readiness",
      userId: "user-1",
    });
    expect(mocks.checkResumeExport).not.toHaveBeenCalled();
  });

  it("returns a friendly unavailable response when rate-limit storage fails", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("events unavailable"));

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "ATS readiness is temporarily unavailable. Please try again.",
    });
    expect(mocks.checkResumeExport).not.toHaveBeenCalled();
  });

  it("rejects oversized resume check requests before rendering", async () => {
    const response = await POST(
      createRequest({
        resumeData: { summary: "R".repeat(200_001) },
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Resume check requests must be 200 KB or smaller.",
    });
    expect(mocks.checkResumeExport).not.toHaveBeenCalled();
  });

  it("normalizes the resume, checks the real export shape, and evaluates it locally", async () => {
    const rawResume = {
      name: "  Taylor Reed  ",
      experience: [{ title: "Product Manager", highlights: "not-an-array" }],
    };
    const normalizedResume = buildResumeData();
    const exportCheck: AtsExportCheck = {
      renderable: true,
      renderFailureReason: null,
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The export spans two pages."],
      recommendedFixes: ["Trim lower-priority content."],
    };
    const readiness = {
      status: "needs_attention",
      score: 88,
      checks: [],
    };
    mocks.coerceResumeDataForExport.mockReturnValue(normalizedResume);
    mocks.checkResumeExport.mockResolvedValue(exportCheck);
    mocks.evaluateAtsReadiness.mockReturnValue(readiness);

    const response = await POST(
      createRequest({
        resumeData: rawResume,
        targetTitle: "  Senior Product Manager  ",
        jobDescription: "  Build accessible B2B workflows.  ",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ readiness });
    expect(mocks.coerceResumeDataForExport).toHaveBeenCalledWith(rawResume);
    expect(mocks.checkResumeExport).toHaveBeenCalledWith(normalizedResume);
    expect(mocks.evaluateAtsReadiness).toHaveBeenCalledWith({
      data: normalizedResume,
      exportCheck,
      targetTitle: "Senior Product Manager",
      jobDescription: "Build accessible B2B workflows.",
    });
  });

  it("preserves a truly missing name for the readiness rules", async () => {
    const coercedResume = buildResumeData();
    mocks.coerceResumeDataForExport.mockReturnValue({
      ...coercedResume,
      name: "Resume",
    });

    await POST(createRequest({ resumeData: { summary: "Experienced operator." } }));

    const expectedData = { ...coercedResume, name: "" };
    expect(mocks.checkResumeExport).toHaveBeenCalledWith(expectedData);
    expect(mocks.evaluateAtsReadiness).toHaveBeenCalledWith(
      expect.objectContaining({ data: expectedData }),
    );
  });

  it("returns a deterministic readiness result when the PDF cannot render", async () => {
    const exportCheck: AtsExportCheck = {
      renderable: false,
      renderFailureReason:
        "The Resume PDF could not render cleanly from the current content.",
      pageCount: null,
      fitsOnOnePage: null,
      overflowReasons: [],
      recommendedFixes: [],
    };
    const readiness = {
      status: "not_ready",
      score: 54,
      criticalFixes: ["Fix the PDF rendering issue."],
    };
    mocks.checkResumeExport.mockResolvedValue(exportCheck);
    mocks.evaluateAtsReadiness.mockReturnValue(readiness);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ readiness });
    expect(mocks.evaluateAtsReadiness).toHaveBeenCalledWith({
      data: buildResumeData(),
      exportCheck,
    });
  });

  it("does not call an external provider to produce the review", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await POST(createRequest());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.evaluateAtsReadiness).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });
});
