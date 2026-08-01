import { describe, expect, it } from "vitest";
import {
  buildQrMatrix,
  buildShareCardModel,
  getFirstName,
  getShareCardTags,
  getShareCardVisual,
  SHARE_CARD_SIZE,
  truncate,
} from "@/lib/share-card";
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

describe("truncate", () => {
  it("keeps values inside the budget untouched", () => {
    expect(truncate("Rachel", 16)).toBe("Rachel");
  });

  it("truncates with a single typographic ellipsis within the character budget", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abcdefghij", 5)).toHaveLength(5);
    expect(truncate("Behavioral Systems Design", 12)).not.toContain("...");
  });
});

describe("getFirstName", () => {
  it("returns the first word of a usable name", () => {
    expect(getFirstName("Rachel Gergely")).toBe("Rachel");
  });

  it("returns an empty string when no usable name exists", () => {
    expect(getFirstName("   ")).toBe("");
    expect(getFirstName(null)).toBe("");
    expect(getFirstName(undefined)).toBe("");
  });
});

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
      expect("headingFont" in visual).toBe(false);
      expect(visual.text).toBe(theme.presentation.text);
      expect(visual.themeName).toBe(theme.name);
      expect(visual.themeVibe).toBe(theme.vibe);
    }
  });

  it("derives refreshed dark gradients from the current registry palette", () => {
    expect(getShareCardVisual("neon").gradientMid).not.toBe("#17102E");
    expect(getShareCardVisual("coral").gradientMid).not.toBe("#0C2128");
    expect(getShareCardVisual("topo").gradientMid).not.toBe("#121924");
    expect(getShareCardVisual("halo").gradientMid).not.toBe("#23111F");
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

describe("buildShareCardModel", () => {
  it("builds one canonical 1200 by 630 card model for every output surface", () => {
    const model = buildShareCardModel({
      appUrl: "https://www.mylivingpage.com/",
      resume: buildResume({
        avatar_url: "https://example.com/avatar.png",
        skills: [{ category: "Focus", items: ["Product Architecture"] }],
      }),
      slug: "rachel-gergely",
    });

    expect(SHARE_CARD_SIZE).toEqual({ width: 1200, height: 630 });
    expect(model.livePageUrl).toBe("https://www.mylivingpage.com/rachel-gergely");
    expect(model.displayUrl).toBe("www.mylivingpage.com/rachel-gergely");
    expect(model.firstName).toBe("Rachel");
    expect(model.tags).toEqual(["Product Architecture"]);
    expect(model.qrMatrix?.length).toBeGreaterThan(20);
  });

  it("keeps a four-module quiet zone around the QR matrix", () => {
    const matrix = buildQrMatrix("https://www.mylivingpage.com/rachel-gergely");

    expect(matrix).not.toBeNull();
    expect(matrix?.slice(0, 4).every((row) => row.every((cell) => !cell))).toBe(true);
    expect(matrix?.every((row) => row.slice(0, 4).every((cell) => !cell))).toBe(true);
    expect(matrix?.some((row) => row.some(Boolean))).toBe(true);
  });
});
