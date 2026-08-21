import { parseResumeText } from "@/lib/resume-import";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import type { ResumeData } from "@/types/resume";

export const LIVING_PROOF_ACHIEVEMENT_MAX = 72;

export type LivingProofSampleId = "platform-lead" | "design-lead";

export interface LivingProofSample {
  achievement: string;
  id: LivingProofSampleId;
  label: string;
  resume: ResumeData;
  role: string;
  sourceLine: string;
}

export interface LivingProofState {
  achievement: string;
  edited: boolean;
  name: string;
  role: string;
  skills: string[];
  sourceKind: "sample" | "paste";
  sourceLabel: string;
  sourceLine: string;
}

export interface LivingProofProjection {
  achievement: string;
  name: string;
  role: string;
  skills: string[];
}

export interface LivingProofPasteResult {
  detectedCount: number;
  issue: string | null;
  state: LivingProofState | null;
}

const PLATFORM_ACHIEVEMENT =
  "Cut release time 38% across product and engineering teams.";

const PLATFORM_RESUME: ResumeData = {
  ...SIGNAL_FRAME_SAMPLE,
  experience: SIGNAL_FRAME_SAMPLE.experience.map((experience, index) =>
    index === 0
      ? {
          ...experience,
          highlights: [
            PLATFORM_ACHIEVEMENT,
            ...experience.highlights.slice(1),
          ],
        }
      : { ...experience, highlights: [...experience.highlights] },
  ),
};

const DESIGN_ACHIEVEMENT =
  "Raised portal task completion 40% through a system redesign.";

const DESIGN_RESUME: ResumeData = {
  name: "Morgan Lee",
  headline: "UX Design Lead",
  location: "Chicago, IL",
  email: "morgan@sample.invalid",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary:
    "Design leader turning research and complex workflows into clear product systems.",
  experience: [
    {
      title: "UX Design Lead",
      company: "Example Care Studio",
      dates: "2021 - Present",
      highlights: [
        DESIGN_ACHIEVEMENT,
        "Built a design system shared by three product teams.",
      ],
      url: null,
    },
  ],
  education: [],
  projects: [
    {
      name: "Accessible Portal System",
      description:
        "A reusable interaction system for high-stakes customer workflows.",
      tech: ["Figma", "Research", "WCAG"],
      url: null,
    },
  ],
  skills: [
    {
      category: "Design",
      items: ["Product design", "Design systems", "User research"],
    },
    {
      category: "Practice",
      items: ["Accessibility", "Facilitation", "Prototyping"],
    },
  ],
  certifications: [],
  stats: [
    { value: "40%", label: "Task Completion" },
    { value: "3", label: "Product Teams" },
  ],
  proofs: [],
  testimonials: [],
};

export const LIVING_PROOF_SAMPLES: readonly LivingProofSample[] = [
  {
    achievement: PLATFORM_ACHIEVEMENT,
    id: "platform-lead",
    label: "Platform leader",
    resume: PLATFORM_RESUME,
    role: "Senior Product & Platform Lead",
    sourceLine: PLATFORM_ACHIEVEMENT,
  },
  {
    achievement: DESIGN_ACHIEVEMENT,
    id: "design-lead",
    label: "Design leader",
    resume: DESIGN_RESUME,
    role: "UX Design Lead",
    sourceLine: DESIGN_ACHIEVEMENT,
  },
] as const;

export function normalizeLivingProofAchievement(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIVING_PROOF_ACHIEVEMENT_MAX)
    .trimEnd();
}

export function createLivingProofState(
  sample: LivingProofSample,
): LivingProofState {
  return {
    achievement: sample.achievement,
    edited: false,
    name: sample.resume.name,
    role: sample.role,
    skills: sample.resume.skills
      .flatMap((group) => group.items)
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 4),
    sourceKind: "sample",
    sourceLabel: `${sample.label} sample résumé`,
    sourceLine: sample.sourceLine,
  };
}

export function editLivingProofAchievement(
  state: LivingProofState,
  value: string,
): LivingProofState {
  const achievement = normalizeLivingProofAchievement(value);
  if (!achievement) return state;

  return {
    ...state,
    achievement,
    edited: achievement !== state.sourceLine,
  };
}

export function buildLivingProofProjection(
  state: LivingProofState,
): LivingProofProjection {
  return {
    achievement: state.achievement,
    name: state.name,
    role: state.role,
    skills: state.skills,
  };
}

function cleanSourceLine(value: string): string {
  return value
    .replace(/^(?:[•●▪◦*+]|-{1,2}|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findSourceLine(text: string, achievement: string): string | null {
  const normalizedAchievement = achievement.toLowerCase();
  const exact = text
    .split(/\r?\n/)
    .map(cleanSourceLine)
    .find((line) => {
      const normalizedLine = line.toLowerCase();
      if (!normalizedLine) return false;
      return (
        normalizedLine.includes(normalizedAchievement) ||
        normalizedAchievement.includes(normalizedLine)
      );
    });

  return exact || null;
}

export function createLivingProofStateFromText(
  text: string,
): LivingProofPasteResult {
  const parsed = parseResumeText(text);
  const sourceFacts = [
    ...parsed.data.experience.flatMap((experience) => experience.highlights),
    ...(parsed.data.proofs?.map((proof) => proof.outcome) ?? []),
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 12);
  const candidate = sourceFacts.find(
    (value) => value.length <= LIVING_PROOF_ACHIEVEMENT_MAX,
  );
  const achievement = normalizeLivingProofAchievement(candidate || "");
  const name = parsed.data.name.trim();

  if (!name || achievement.length < 12) {
    return {
      detectedCount: parsed.detectedFields.length,
      issue:
        name && sourceFacts.length > 0
          ? `Use one result with ${LIVING_PROOF_ACHIEVEMENT_MAX} characters or fewer for this preview.`
          : "We need a name and one clear result before we can build this local preview.",
      state: null,
    };
  }

  const role =
    parsed.data.experience[0]?.title.trim() ||
    parsed.data.headline.trim() ||
    "Professional profile";
  const sourceLine =
    findSourceLine(text, candidate || achievement) ||
    cleanSourceLine(parsed.fieldSources.experience?.sourceLine || candidate || achievement);

  return {
    detectedCount: parsed.detectedFields.length,
    issue: null,
    state: {
      achievement,
      edited: achievement !== sourceLine,
      name,
      role,
      skills: parsed.data.skills
        .flatMap((group) => group.items)
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 4),
      sourceKind: "paste",
      sourceLabel: "Pasted résumé · read locally",
      sourceLine,
    },
  };
}
