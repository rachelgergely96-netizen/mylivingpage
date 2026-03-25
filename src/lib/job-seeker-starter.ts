import { slugifyVariantLabel } from "@/lib/page-variants";
import type {
  JobSeekerAudience,
  JobSeekerGoal,
  JobSeekerProfile,
  JobSeekerRoleTrack,
  PageVariant,
  ProofItem,
  ProofType,
  ResumeData,
  TestimonialRecord,
} from "@/types/resume";

export const JOB_SEEKER_ROLE_OPTIONS: Array<{
  id: JobSeekerRoleTrack;
  label: string;
  headlineHint: string;
  proofPrompt: string;
}> = [
  {
    id: "engineering",
    label: "Engineering",
    headlineHint: "Show systems shipped, scale, and technical depth.",
    proofPrompt: "Show the product, system, or technical result behind your work.",
  },
  {
    id: "product",
    label: "Product",
    headlineHint: "Show decisions, launches, prioritization, and business outcomes.",
    proofPrompt: "Show one roadmap, launch, or decision framework that changed an outcome.",
  },
  {
    id: "marketing",
    label: "Marketing",
    headlineHint: "Show campaigns, growth, content, and measurable lift.",
    proofPrompt: "Show a campaign, content system, or funnel win with results.",
  },
  {
    id: "sales",
    label: "Sales",
    headlineHint: "Show pipeline influence, quota performance, and expansion wins.",
    proofPrompt: "Show a deal, territory, or process win with visible revenue impact.",
  },
  {
    id: "operations",
    label: "Operations",
    headlineHint: "Show execution, cross-functional systems, and efficiency gains.",
    proofPrompt: "Show the workflow or operating system you improved and the result it created.",
  },
];

export const JOB_SEEKER_GOAL_OPTIONS: Array<{
  id: JobSeekerGoal;
  label: string;
  description: string;
}> = [
  {
    id: "land_interviews",
    label: "Land interviews",
    description: "Optimize for cold applications and recruiter reviews.",
  },
  {
    id: "strengthen_followups",
    label: "Strengthen follow-ups",
    description: "Give people cleaner context after they already know your name.",
  },
  {
    id: "turn_referrals",
    label: "Turn referrals",
    description: "Make warm intros easier to forward and understand.",
  },
];

export const JOB_SEEKER_AUDIENCE_OPTIONS: Array<{
  id: JobSeekerAudience;
  label: string;
  variantLabel: string;
  ctaEmphasis: string;
}> = [
  {
    id: "recruiter",
    label: "Recruiters",
    variantLabel: "Recruiter follow-up",
    ctaEmphasis: "Built for a recruiter skim and quick follow-up.",
  },
  {
    id: "hiring_manager",
    label: "Hiring managers",
    variantLabel: "Hiring manager version",
    ctaEmphasis: "Built for a hiring manager who wants proof and role fit fast.",
  },
  {
    id: "referral",
    label: "Referrals",
    variantLabel: "Referral intro",
    ctaEmphasis: "Built for a warm intro that needs to be easy to forward.",
  },
];

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
}

function compactText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function getRoleOption(roleTrack: JobSeekerRoleTrack | null | undefined) {
  return JOB_SEEKER_ROLE_OPTIONS.find((option) => option.id === roleTrack) ?? null;
}

function getAudienceOption(targetAudience: JobSeekerAudience | null | undefined) {
  return JOB_SEEKER_AUDIENCE_OPTIONS.find((option) => option.id === targetAudience) ?? null;
}

function pickQuantifiedHighlight(data: ResumeData) {
  const highlightedResult = data.experience
    .flatMap((entry) => entry.highlights)
    .find((highlight) => /\d/.test(highlight));

  if (highlightedResult) {
    return highlightedResult;
  }

  return data.stats[0] ? `${data.stats[0].value} ${data.stats[0].label}`.trim() : null;
}

function pickSelectedWin(data: ResumeData) {
  return (
    data.experience
      .flatMap((entry) => entry.highlights)
      .find((highlight) => highlight.trim().length > 0) ??
    data.summary
  );
}

export function createEmptyProofItem(type: ProofType = "case_study"): ProofItem {
  return {
    id: createLocalId("proof"),
    type,
    title: "",
    summary: "",
    outcome: "",
    url: null,
    source_label: null,
  };
}

export function createEmptyTestimonialRecord(): TestimonialRecord {
  return {
    id: createLocalId("testimonial"),
    name: "",
    role: "",
    company: "",
    relationship: null,
    quote: "",
    status: "draft",
    requested_at: null,
    approved_at: null,
  };
}

export function normalizeStructuredResumeData(
  data: ResumeData,
  profile?: JobSeekerProfile | null,
): ResumeData {
  const proofs = buildAutoProofItems(data, profile);
  const testimonials = data.testimonials ?? [];

  return {
    ...data,
    proofs,
    testimonials,
  };
}

export function buildAutoProofItems(
  data: ResumeData,
  profile?: JobSeekerProfile | null,
): ProofItem[] {
  if ((data.proofs ?? []).length > 0) {
    return data.proofs ?? [];
  }

  const roleOption = getRoleOption(profile?.role_track);
  const items: ProofItem[] = [];
  const quantifiedHighlight = pickQuantifiedHighlight(data);
  const project = data.projects[0] ?? null;
  const selectedWin = pickSelectedWin(data);

  if (quantifiedHighlight) {
    items.push({
      id: createLocalId("proof"),
      type: "quantified_result",
      title: "Quantified result",
      summary: truncate(
        roleOption?.proofPrompt ?? "Show the measurable result behind your strongest work.",
        140,
      ),
      outcome: quantifiedHighlight,
      url: null,
      source_label: "Impact snapshot",
    });
  }

  if (project) {
    items.push({
      id: createLocalId("proof"),
      type: project.url ? "project_artifact" : "case_study",
      title: project.name || "Selected proof of work",
      summary: truncate(
        compactText(project.description) || "Selected proof of work from this profile.",
        220,
      ),
      outcome:
        project.tech.length > 0
          ? `Built with ${project.tech.slice(0, 3).join(", ")}`
          : "Selected to show how the work translates in practice.",
      url: project.url,
      source_label: project.url ? "Proof link" : "Case study",
    });
  }

  if (selectedWin && items.length < 3) {
    items.push({
      id: createLocalId("proof"),
      type: "selected_win",
      title: "Selected win",
      summary: truncate(selectedWin, 220),
      outcome: compactText(data.headline) || "Relevant to the role this page is supporting.",
      url: data.website,
      source_label: data.website ? "Supporting link" : null,
    });
  }

  return items.slice(0, 3);
}

export function buildStarterVariant(
  data: ResumeData,
  profile: JobSeekerProfile,
): PageVariant {
  const audience = getAudienceOption(profile.target_audience);

  return {
    id: createLocalId("variant"),
    slug: slugifyVariantLabel(audience?.variantLabel ?? "Targeted version"),
    label: audience?.variantLabel ?? "Targeted version",
    roleTitle: compactText(data.headline) || getRoleOption(profile.role_track)?.label || "",
    headline: compactText(data.headline) || null,
    summary: compactText(data.summary) || null,
    featuredStatLabels: data.stats.slice(0, 2).map((stat) => stat.label),
    featuredProjectNames: data.projects.slice(0, 1).map((project) => project.name),
    sectionOrder: [
      "summary",
      "stats",
      "projects",
      "experience",
      "skills",
      "education",
      "certifications",
    ],
    ctaEmphasis: audience?.ctaEmphasis ?? null,
  };
}

export function describeJobSeekerProfile(profile: JobSeekerProfile | null | undefined) {
  if (!profile) {
    return null;
  }

  const role = getRoleOption(profile.role_track)?.label ?? "Job seeker";
  const goal = JOB_SEEKER_GOAL_OPTIONS.find((option) => option.id === profile.primary_goal)?.label;
  const audience = getAudienceOption(profile.target_audience)?.label;

  return {
    role,
    goal: goal ?? "Land interviews",
    audience: audience ?? "Recruiters",
  };
}
