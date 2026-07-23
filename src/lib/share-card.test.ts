import { describe, expect, it } from "vitest";
import { getShareCardTags, getShareCardVisual } from "@/lib/share-card";
import { THEME_MAP, THEME_REGISTRY } from "@/themes/registry";
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

describe("getShareCardVisual", () => {
  it("derives every card identity from the Living Page registry", () => {
    for (const theme of THEME_REGISTRY) {
      const visual = getShareCardVisual(theme.id);

      expect(visual.themeId).toBe(theme.id);
      expect(visual.accent).toBe(theme.presentation.accent);
      expect(visual.accentBright).toBe(theme.presentation.accentBright);
      expect(visual.contentProfile).toBe(theme.contentProfile);
      expect(visual.collection).toBe(theme.collection);
      expect(visual.headingFont).toBe(theme.presentation.headingFont);
      expect(visual.text).toBe(theme.presentation.text);
    }
  });

  it("keeps the six paired prototypes visually distinct", () => {
    expect(getShareCardVisual("meridian").motif).toBe("bearing");
    expect(getShareCardVisual("halo").motif).toBe("orbit");
    expect(getShareCardVisual("sakura").motif).toBe("petal");
    expect(getShareCardVisual("aurora").motif).toBe("curtain");
    expect(getShareCardVisual("silk").motif).toBe("weave");
    expect(getShareCardVisual("topo").motif).toBe("contour");
  });

  it("supports light themes and falls back safely for unknown ids", () => {
    const atelier = getShareCardVisual("atelier");
    const fallback = getShareCardVisual("not-a-theme");

    expect(atelier.lightGround).toBe(true);
    expect(atelier.text).toBe(THEME_MAP.atelier.presentation.text);
    expect(atelier.gradientFrom).not.toMatch(/^#0[0-9A-F]/i);
    expect(fallback.themeId).toBe("cosmic");
    expect(fallback.accent).toBe(THEME_MAP.cosmic.presentation.accent);
  });
});
