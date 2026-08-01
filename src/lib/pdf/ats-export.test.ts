import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  buildResumePdfData,
  countPdfPages,
  formatExperienceHighlightsAsParagraph,
  formatSkillsGroupAsSentence,
  renderFallbackResumePdf,
  renderResumePdf,
} from "@/lib/pdf/ats-export";
import type { ResumeData } from "@/types/resume";

function extractPdfTextLines(buffer: Uint8Array): string[] {
  const raw = Buffer.from(buffer);
  const body = raw.toString("latin1");
  const contentStreams: string[] = [];
  const streamPattern = /stream\r?\n/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamPattern.exec(body)) !== null) {
    const start = streamMatch.index + streamMatch[0].length;
    const end = body.indexOf("endstream", start);
    if (end === -1) {
      continue;
    }

    try {
      contentStreams.push(inflateSync(raw.subarray(start, end)).toString("latin1"));
    } catch {
      // Not a compressed content stream (xref tables, metadata, ...).
    }
  }

  const lines: string[] = [];
  const textRunPattern = /\[((?:<[0-9a-fA-F]+>|-?\d+(?:\.\d+)?|\s)+)\]\s*TJ/g;

  for (const stream of contentStreams) {
    let runMatch: RegExpExecArray | null;
    while ((runMatch = textRunPattern.exec(stream)) !== null) {
      const text = (runMatch[1].match(/<[0-9a-fA-F]+>/g) ?? [])
        .map((part) =>
          part
            .slice(1, -1)
            .replace(/[0-9a-fA-F]{2}/g, (pair) => String.fromCharCode(parseInt(pair, 16))),
        )
        .join("");
      if (text) {
        lines.push(text);
      }
    }
  }

  return lines;
}

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Taylor Reed",
    headline: "Product Manager",
    location: "Austin, TX",
    email: "taylor@example.com",
    linkedin: "https://linkedin.com/in/taylor-reed",
    github: "taylorreed",
    website: "taylorreed.dev",
    avatar_url: "https://cdn.example.com/avatar.png",
    summary: "Product Manager \u2022 shipping SaaS products with SQL and UX collaboration.",
    experience: [
      {
        title: "Product Manager",
        company: "Northwind",
        dates: "2022 - Present",
        highlights: ["Owned roadmap and analytics", "Partnered with engineering and design"],
        url: "northwind.example.com",
      },
    ],
    education: [{ degree: "B.A. Economics", school: "University", year: "2019" }],
    projects: [
      {
        name: "Launch Hub",
        description: "Internal launch tooling",
        tech: ["React", "SQL"],
        url: null,
      },
    ],
    skills: [{ category: "Tools", items: ["SQL", "Figma", "Amplitude"] }],
    certifications: [{ name: "CSPO", issuer: "Scrum Alliance", date: "2023" }],
    stats: [{ value: "5+", label: "Years" }],
    ...overrides,
  };
}

describe("Resume PDF export data shaping", () => {
  it("normalizes export data and removes public-page-only stats", () => {
    const exportData = buildResumePdfData(buildResume());

    expect(exportData.summary).toBe(
      "Product Manager - shipping SaaS products with SQL and UX collaboration.",
    );
    expect(exportData.linkedin).toBe("linkedin.com/in/taylor-reed");
    expect(exportData.github).toBe("github.com/taylorreed");
    expect(exportData.stats).toEqual([]);
  });

  it("coerces malformed saved data into a safe export shape", () => {
    const exportData = buildResumePdfData({
      name: 42,
      summary: ["Legacy summary"],
      experience: null,
      education: [{ degree: "B.A.", school: 2024, year: true }],
      projects: [{ name: "Launch", description: false, tech: "React", url: null }],
      skills: [{ category: "Core", items: "Strategy" }],
      certifications: [{ name: "Cert", issuer: 11, date: false }],
      stats: [{ value: 5, label: "Years" }],
    } as unknown);

    expect(exportData).toMatchObject({
      name: "42",
      summary: "Legacy summary",
      experience: [],
      education: [{ degree: "B.A.", school: "2024", year: "" }],
      projects: [{ name: "Launch", description: "", tech: ["React"], url: null }],
      skills: [{ category: "Core", items: ["Strategy"] }],
      certifications: [{ name: "Cert", issuer: "11", date: null }],
      stats: [],
    });
  });

  it("joins experience highlights into one justified-ready paragraph", () => {
    expect(
      formatExperienceHighlightsAsParagraph([
        " - Built a better workflow",
        "Partnered with engineering and design",
        "\u2022 Reduced review time by 30%!",
      ]),
    ).toBe(
      "Built a better workflow. Partnered with engineering and design. Reduced review time by 30%.",
    );
  });

  it("adds a terminal period to each skills sentence", () => {
    expect(
      formatSkillsGroupAsSentence({
        category: "Tools",
        items: ["SQL", "Figma", "Amplitude"],
      }),
    ).toBe("Tools: SQL, Figma, Amplitude.");
  });

  it(
    "renders sections in canonical order with clean subtitles, one-line dates, and project links",
    { timeout: 15_000 },
    async () => {
      const resume = buildResume({
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "January 2024 - Present",
            highlights: ["Owned roadmap and analytics"],
            url: "northwind.example.com",
          },
          {
            title: "Contract Reviewer",
            company: "",
            dates: "2023",
            highlights: ["Reviewed vendor agreements"],
            url: "example.com/contract-work",
          },
        ],
        projects: [
          {
            name: "Launch Hub",
            description: "Internal launch tooling",
            tech: ["React", "SQL"],
            url: "https://launchhub.example.com",
          },
        ],
      });

      const lines = extractPdfTextLines(await renderResumePdf(resume));

      const sectionOrder = ["EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"].map(
        (title) => lines.indexOf(title),
      );
      expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
      expect(sectionOrder.every((index) => index !== -1)).toBe(true);

      // A month-range date stays on a single line in the date column.
      expect(lines).toContain("January 2024 - Present");

      // A URL-only experience subtitle renders without a dangling " | " separator.
      expect(lines).toContain("example.com/contract-work");
      expect(lines.some((line) => line.startsWith("| "))).toBe(false);

      // Project URLs print alongside the description, like experience URLs.
      expect(lines).toContain("Internal launch tooling | launchhub.example.com");
    },
  );

  it(
    "renders the fallback document with projects directly after experience and project links",
    { timeout: 15_000 },
    async () => {
      const lines = extractPdfTextLines(
        await renderFallbackResumePdf(
          buildResume({
            projects: [
              {
                name: "Launch Hub",
                description: "Internal launch tooling",
                tech: ["React", "SQL"],
                url: "https://launchhub.example.com",
              },
            ],
          }),
        ),
      );

      const sectionOrder = ["EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"].map(
        (title) => lines.indexOf(title),
      );
      expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
      expect(sectionOrder.every((index) => index !== -1)).toBe(true);
      expect(lines).toContain("Internal launch tooling | launchhub.example.com");
    },
  );

  it(
    "renders a very dense real-world resume cleanly without layout failure",
    { timeout: 15_000 },
    async () => {
      const buffer = await renderResumePdf({
      name: "Rachel Gergely",
      headline: "Founder | Attorney | Product Architect",
      location: "New York City & Orlando, Florida",
      email: "rachelgergely@outlook.com",
      linkedin: "https://linkedin.com/in/rachel-gergely-75ba86105/",
      summary:
        "New York-admitted attorney and product founder working at the intersection of law, behavioral design, and digital systems. Focused on building systems that reduce friction in complex environments and make intimidating processes feel simple. Graduated Magna Cum Laude from Brooklyn Law School with expertise in product architecture and behavioral system design.",
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
        {
          title: "Legal Intern",
          company: "The Children's Law Center",
          dates: "2021",
          highlights: [
            "Interviewed and counseled child clients in neglect proceedings",
            "Assisted attorneys in case preparation and analysis for child advocacy matters",
          ],
          url: null,
        },
      ],
      education: [
        { degree: "Juris Doctor, Magna Cum Laude", school: "Brooklyn Law School", year: "2019 - 2022" },
        {
          degree: "Bachelor of Science in Business, Management, Marketing, Magna Cum Laude",
          school: "University at Albany, SUNY",
          year: "2014 - 2018",
        },
        { degree: "High School Diploma", school: "St. Anthony's High School", year: "2010 - 2014" },
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
          items: ["Legal Analysis", "Litigation", "Legal Research", "Motion Drafting", "Family Law"],
        },
        {
          category: "Systems & Strategy",
          items: [
            "Structured Reasoning",
            "Process Simplification",
            "Digital Identity Infrastructure",
            "AI-assisted Tools",
          ],
        },
        {
          category: "Technology Domains",
          items: [
            "Education Technology",
            "Gamified Learning Environments",
            "Document Interpretation Tools",
            "Risk Signal Identification",
          ],
        },
      ],
      certifications: [
        { name: "New York Bar", issuer: "New York State", date: null },
        { name: "Florida Bar Admission", issuer: "Florida State", date: "Pending" },
      ],
      stats: [],
    });

      expect(Buffer.from(buffer).subarray(0, 4).toString("ascii")).toBe("%PDF");
      expect(countPdfPages(buffer)).toBeLessThanOrEqual(2);
    },
  );
});
