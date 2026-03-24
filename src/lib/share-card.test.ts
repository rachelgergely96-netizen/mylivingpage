import { describe, expect, it } from "vitest";
import { getShareCardTags } from "@/lib/share-card";
import type { ResumeData } from "@/types/resume";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York City & Orlando, Florida",
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

describe("getShareCardTags", () => {
  it("keeps full tag phrases instead of truncating them with ellipses", () => {
    const tags = getShareCardTags(
      buildResume({
        skills: [
          {
            category: "Focus",
            items: ["Product Architecture", "Behavioral Systems Design"],
          },
        ],
      }),
    );

    expect(tags).toEqual(["Product Architecture", "Behavioral Systems Design"]);
    expect(tags.some((tag) => tag.includes("..."))).toBe(false);
  });

  it("still deduplicates tags and limits the card to four", () => {
    const tags = getShareCardTags(
      buildResume({
        skills: [
          {
            category: "Focus",
            items: ["Product Architecture", "Narrative Systems", "User Engagement Design"],
          },
        ],
        projects: [
          {
            name: "Product Architecture",
            description: "",
            tech: [],
            url: null,
          },
          {
            name: "Behavioral Systems Design",
            description: "",
            tech: [],
            url: null,
          },
          {
            name: "Strategic Messaging",
            description: "",
            tech: [],
            url: null,
          },
        ],
      }),
    );

    expect(tags).toEqual([
      "Product Architecture",
      "Narrative Systems",
      "User Engagement Design",
      "Behavioral Systems Design",
    ]);
  });
});
