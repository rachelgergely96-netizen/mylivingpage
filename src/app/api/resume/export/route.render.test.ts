import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => mocks.serviceRoleFactory()),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/resume/export/route";
import {
  countPdfPages,
  renderFallbackResumePdf,
  renderResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import type { ResumeData } from "@/types/resume";

function buildRealWorldResumeData(): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York City & Orlando, Florida",
    email: "rachelgergely@outlook.com",
    linkedin: "linkedin.com/in/rachel-gergely-75ba86105/",
    github: null,
    website: null,
    avatar_url: null,
    summary:
      "New York-admitted attorney and product founder working at the intersection of law, behavioral design, and digital systems. Focused on building systems that reduce friction in complex environments and make intimidating processes feel simple.",
    experience: [
      {
        title: "Founder & Product Lead",
        company: "BarPrepPlay",
        dates: "2024 - Present",
        highlights: [
          "Built gamified bar exam preparation platform serving 275+ active users",
          "Developed micro-session MBE drill engine and structured progression mechanics",
          "Created reinforcement loops based on behavioral engagement principles",
        ],
        url: "barprepplay.com",
      },
      {
        title: "Founder & Architect",
        company: "MyLivingPage",
        dates: "2024 - Present",
        highlights: [
          "Designed digital identity platform to replace static resumes with evolving professional presence",
          "Built modular identity architecture with layered professional narratives",
          "Created structured personal authorship and evolving timeline systems",
        ],
        url: "mylivingpage.com",
      },
      {
        title: "Legal Associate",
        company: "Simmons Jannace DeLuca, LLP",
        dates: "2024 - 2025",
        highlights: [
          "Worked on litigation matters involving legal research and motion drafting",
          "Analyzed factual records and developed legal arguments for procedural strategy",
        ],
        url: null,
      },
      {
        title: "Legal Associate",
        company: "Law Offices of Eyal Talassazan, P.C.",
        dates: "2022 - 2023",
        highlights: [
          "Managed family law and litigation practice responsibilities",
          "Drafted pleadings and legal motions, managed discovery processes",
          "Assisted with trial preparation and financial documentation review",
        ],
        url: null,
      },
    ],
    education: [
      {
        degree: "Juris Doctor, Magna Cum Laude",
        school: "Brooklyn Law School",
        year: "2019 - 2022",
      },
      {
        degree: "Bachelor of Science in Business, Management, Marketing, Magna Cum Laude",
        school: "University at Albany, SUNY",
        year: "2014 - 2018",
      },
    ],
    projects: [],
    skills: [
      {
        category: "Product & Design",
        items: [
          "Product Architecture",
          "Behavioral System Design",
          "User Engagement Systems",
          "Narrative Systems Design",
        ],
      },
      {
        category: "Legal",
        items: [
          "Legal Analysis",
          "Litigation",
          "Legal Research",
          "Motion Drafting",
          "Family Law",
        ],
      },
    ],
    certifications: [
      {
        name: "New York Bar",
        issuer: "New York State",
        date: null,
      },
      {
        name: "Florida Bar Admission",
        issuer: "Florida State",
        date: "Pending",
      },
    ],
    stats: [],
  };
}

function buildDenseResumeData(): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York City & Orlando, Florida",
    email: "rachelgergely@outlook.com",
    linkedin: "linkedin.com/in/rachel-gergely-75ba86105/",
    github: null,
    website: null,
    avatar_url: null,
    summary:
      "New York-admitted attorney and product founder working at the intersection of law, behavioral design, and digital systems. Focused on building systems that reduce friction in complex environments and make intimidating processes feel simple. Graduated magna cum laude from Brooklyn Law School with expertise in product architecture and behavioral system design.",
    experience: [
      {
        title: "Founder & Product Lead",
        company: "BarPrepPlay",
        dates: "2024 - Present",
        highlights: [
          "Built gamified bar exam preparation platform serving 300+ active users.",
          "Designed adaptive reinforcement loops grounded in behavioral engagement mechanics.",
        ],
        url: "barprepplay.com",
      },
      {
        title: "Founder & Architect",
        company: "MyLivingPage",
        dates: "2024 - Present",
        highlights: [
          "Designed a living resume platform that replaces static PDFs with evolving professional presence.",
          "Built modular identity architecture that clarifies experience, proof, and contact moments.",
        ],
        url: "mylivingpage.com",
      },
      {
        title: "Legal Associate",
        company: "Simmons Jannace DeLuca, LLP",
        dates: "2024 - 2025",
        highlights: [
          "Worked on litigation matters involving legal research, motion drafting, and procedural strategy.",
          "Analyzed factual records and developed arguments for case positioning and motion practice.",
        ],
        url: null,
      },
      {
        title: "Legal Associate",
        company: "Law Offices of Eyal Talassazan, P.C.",
        dates: "2022 - 2023",
        highlights: [
          "Managed family law and litigation practice responsibilities with strong client communication.",
          "Drafted pleadings, motions, and discovery materials while supporting trial preparation.",
        ],
        url: null,
      },
    ],
    education: [
      {
        degree: "Juris Doctor, Magna Cum Laude",
        school: "Brooklyn Law School",
        year: "2019 - 2022",
      },
      {
        degree: "Bachelor of Science in Business, Management, Marketing, Magna Cum Laude",
        school: "University at Albany, SUNY",
        year: "2014 - 2018",
      },
      {
        degree: "High School Diploma",
        school: "St. Anthony's High School",
        year: "2010 - 2014",
      },
    ],
    projects: [],
    skills: [
      {
        category: "Product & Design",
        items: [
          "Product Architecture",
          "Behavioral System Design",
          "User Engagement Systems",
          "Narrative Systems Design",
          "Figma",
        ],
      },
      {
        category: "Legal",
        items: [
          "Legal Analysis",
          "Litigation",
          "Legal Research",
          "Motion Drafting",
          "Family Law",
        ],
      },
      {
        category: "Tools",
        items: ["Next.js", "TypeScript", "Supabase", "Systems Thinking"],
      },
    ],
    certifications: [
      {
        name: "New York Bar",
        issuer: "New York State",
        date: null,
      },
      {
        name: "Florida Bar Admission",
        issuer: "Florida State",
        date: "Pending",
      },
    ],
    stats: [],
  };
}

function createPageResponse() {
  return {
    id: "page-1",
    owner_id: "owner-1",
    user_id: "owner-1",
    visibility: "public" as const,
    status: "live" as const,
    resume_data: buildRealWorldResumeData(),
  };
}

function createServiceRoleClient() {
  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: createPageResponse(),
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      plan: "spark",
                      billing_cohort: "legacy_freemium",
                      hosting_trial_started_at: null,
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("POST /api/resume/export real render path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 11,
      resetAt: new Date("2026-03-20T00:00:00.000Z").toISOString(),
    });
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.serviceRoleFactory.mockReturnValue(createServiceRoleClient());
  });

  it("returns a real PDF for a dense live-page resume without mocking the renderer", async () => {
    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("rachel-gergely-resume.pdf");

    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it("renders a real-world dense resume fixture through the production-safe renderer", async () => {
    const buffer = await renderResumePdf(buildRealWorldResumeData());

    expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(countPdfPages(buffer)).toBe(1);
  });

  it("renders a fallback PDF for malformed but salvageable saved data", async () => {
    const buffer = await renderFallbackResumePdf({
      name: true,
      summary: "Simple fallback summary",
      experience: [
        {
          title: "Founder",
          company: 11,
          dates: null,
          highlights: "Built the first version.",
        },
      ],
      skills: [{ category: "Core", items: ["Product", 5] }],
    } as unknown);

    expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it("renders unicode-heavy saved content after sanitization", async () => {
    const buffer = await renderResumePdf({
      name: "Jos\u00e9 \ud83d\ude80",
      headline: "Product Lead \u2014 Platforms",
      summary: "Led growth \u2022 shipped tools \ud83c\udf1f",
      experience: [
        {
          title: "Founder",
          company: "Cr\u00e8me Labs",
          dates: "2022 \u2014 2024",
          highlights: ["Built the platform \ud83d\udca1"],
        },
      ],
      skills: [{ category: "", items: ["Strategy", "\ud83d\ude80"] }],
    } as unknown);

    expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it("keeps a denser resume fixture to a tighter page count", async () => {
    const buffer = await renderResumePdf(buildDenseResumeData());

    expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeLessThanOrEqual(2);
  });
});
