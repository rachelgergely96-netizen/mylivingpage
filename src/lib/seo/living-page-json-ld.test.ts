import { describe, expect, it } from "vitest";
import { buildLivingPageJsonLd } from "@/lib/seo/living-page-json-ld";
import type { ResumeData } from "@/types/resume";

const URL = "https://mylivingpage.com/rachel";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York City",
    email: null,
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    stats: [],
    ...overrides,
  };
}

function buildPage(overrides: Partial<Parameters<typeof buildLivingPageJsonLd>[0]["page"]> = {}) {
  return {
    published_at: "2026-07-01T00:00:00Z",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

function getGraph(resume: ResumeData, page = buildPage()) {
  const jsonLd = buildLivingPageJsonLd({ page, resume, url: URL });
  const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;
  const profilePage = graph.find((node) => node["@type"] === "ProfilePage")!;
  const person = graph.find((node) => node["@type"] === "Person")!;
  return { jsonLd, profilePage, person };
}

describe("buildLivingPageJsonLd", () => {
  it("emits a ProfilePage whose mainEntity is the Person", () => {
    const { jsonLd, profilePage, person } = getGraph(buildResume());

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(profilePage.mainEntity).toEqual({ "@id": `${URL}#person` });
    expect(person["@id"]).toBe(`${URL}#person`);
    expect(person.name).toBe("Rachel Gergely");
    expect(person.jobTitle).toBe("Founder | Attorney | Product Architect");
    expect(profilePage.datePublished).toBe("2026-07-01T00:00:00Z");
    expect(profilePage.dateModified).toBe("2026-07-15T00:00:00Z");
  });

  it("normalizes social links into sameAs urls", () => {
    const { person } = getGraph(
      buildResume({
        linkedin: "linkedin.com/in/rachel",
        github: "rachelg",
        website: "https://rachel.dev",
      }),
    );

    expect(person.sameAs).toEqual([
      "https://linkedin.com/in/rachel",
      "https://github.com/rachelg",
      "https://rachel.dev",
    ]);
  });

  it("flattens grouped skills and accepts the legacy string[] shape", () => {
    const grouped = getGraph(
      buildResume({
        skills: [
          { category: "Legal", items: ["Contracts", "IP"] },
          { category: "Product", items: ["Roadmapping"] },
        ],
      }),
    );
    expect(grouped.person.knowsAbout).toEqual([
      "Contracts",
      "IP",
      "Roadmapping",
    ]);

    const legacy = getGraph(
      buildResume({
        skills: ["Contracts", "IP"] as unknown as ResumeData["skills"],
      }),
    );
    expect(legacy.person.knowsAbout).toEqual(["Contracts", "IP"]);
  });

  it("maps the most recent role to worksFor and schools to alumniOf", () => {
    const { person } = getGraph(
      buildResume({
        experience: [
          {
            title: "Founder",
            company: "MyLivingPage",
            dates: "2025 - Present",
            highlights: [],
            url: "mylivingpage.com",
          },
          {
            title: "Attorney",
            company: "BigLaw LLP",
            dates: "2020 - 2025",
            highlights: [],
            url: null,
          },
        ],
        education: [{ degree: "JD", school: "Fordham Law", year: "2020" }],
      }),
    );

    expect(person.worksFor).toEqual({
      "@type": "Organization",
      name: "MyLivingPage",
      url: "https://mylivingpage.com",
    });
    expect(person.alumniOf).toEqual([
      { "@type": "EducationalOrganization", name: "Fordham Law" },
    ]);
  });

  it("accepts legacy string certifications", () => {
    const { person } = getGraph(
      buildResume({
        certifications: [
          "NY Bar",
          { name: "FL Bar", issuer: "Florida Bar", date: "2021" },
        ] as unknown as ResumeData["certifications"],
      }),
    );

    expect(person.hasCredential).toEqual([
      { "@type": "EducationalOccupationalCredential", name: "NY Bar" },
      {
        "@type": "EducationalOccupationalCredential",
        name: "FL Bar",
        recognizedBy: { "@type": "Organization", name: "Florida Bar" },
      },
    ]);
  });

  it("omits empty optional fields instead of emitting nulls", () => {
    const { person, profilePage } = getGraph(
      buildResume(),
      buildPage({ published_at: null, updated_at: "" as unknown as string }),
    );

    expect(person).not.toHaveProperty("email");
    expect(person).not.toHaveProperty("sameAs");
    expect(person).not.toHaveProperty("knowsAbout");
    expect(person).not.toHaveProperty("worksFor");
    expect(person).not.toHaveProperty("hasCredential");
    expect(profilePage.datePublished).toBe("2026-06-01T00:00:00Z");
    expect(profilePage).not.toHaveProperty("dateModified");
  });
});
