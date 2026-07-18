import { describe, expect, it } from "vitest";
import {
  buildStarterVariant,
  describeJobSeekerProfile,
  normalizeStructuredResumeData,
} from "@/lib/job-seeker-starter";
import type { JobSeekerProfile, ResumeData } from "@/types/resume";

const BASE_RESUME: ResumeData = {
  name: "Avery Stone",
  headline: "Senior Product Manager",
  location: "New York, NY",
  email: "avery@example.com",
  linkedin: "linkedin.com/in/avery",
  github: null,
  website: "avery.example.com",
  avatar_url: null,
  summary: "Product leader focused on growth systems and launch execution.",
  experience: [
    {
      title: "Senior Product Manager",
      company: "Northstar",
      dates: "2022 - Present",
      highlights: [
        "Launched onboarding overhaul that lifted activation 24% in one quarter.",
        "Built a cross-functional planning cadence used across product and GTM.",
      ],
      url: null,
    },
  ],
  education: [
    {
      degree: "B.A. Economics",
      school: "State University",
      year: "2018",
    },
  ],
  projects: [
    {
      name: "Activation playbook",
      description: "Reusable framework for diagnosing drop-off and prioritizing experiments.",
      tech: ["Amplitude", "SQL", "Figma"],
      url: "https://example.com/playbook",
    },
  ],
  skills: [
    {
      category: "Product",
      items: ["Roadmapping", "Experimentation", "Stakeholder alignment"],
    },
  ],
  certifications: [],
  stats: [
    {
      value: "24%",
      label: "activation lift",
    },
  ],
  testimonials: [
    {
      id: "testimonial-1",
      name: "Jordan Lee",
      role: "VP Product",
      company: "Northstar",
      relationship: "Manager",
      quote: "Avery turns messy inputs into clean decisions and visible results.",
      status: "approved",
      requested_at: "2026-03-01",
      approved_at: "2026-03-02",
    },
  ],
};

const PROFILE: JobSeekerProfile = {
  role_track: "product",
  primary_goal: "strengthen_followups",
  target_audience: "hiring_manager",
};

describe("job-seeker starter helpers", () => {
  it("seeds structured proof items when the page has no manual proof blocks yet", () => {
    const next = normalizeStructuredResumeData(
      {
        ...BASE_RESUME,
        proofs: [],
      },
      PROFILE,
    );

    expect(next.proofs).toHaveLength(3);
    expect(next.proofs?.[0]).toMatchObject({
      type: "quantified_result",
      outcome: "Launched onboarding overhaul that lifted activation 24% in one quarter.",
    });
    expect(next.proofs?.[1]).toMatchObject({
      type: "project_artifact",
      title: "Activation playbook",
      source_label: "Proof link",
    });
    expect(next.testimonials).toHaveLength(1);
  });

  it("builds a targeted starter variant and readable summary for the selected audience", () => {
    const variant = buildStarterVariant(BASE_RESUME, PROFILE);
    const summary = describeJobSeekerProfile(PROFILE);

    expect(variant).toMatchObject({
      label: "Hiring manager version",
      slug: "hiring-manager-version",
      roleTitle: "Senior Product Manager",
      featuredProjectNames: ["Activation playbook"],
      ctaEmphasis: "Built for a hiring manager who wants proof and role fit fast.",
    });
    expect(summary).toEqual({
      role: "Product",
      goal: "Strengthen follow-ups",
      audience: "Hiring managers",
    });
  });

  it("supports a neutral professional-card setup without assuming a job search", () => {
    const profile: JobSeekerProfile = {
      role_track: "general",
      primary_goal: "share_profile",
      target_audience: "general_public",
    };

    expect(describeJobSeekerProfile(profile)).toEqual({
      role: "General / multi-hyphenate",
      goal: "Share my professional story",
      audience: "Professional contacts",
    });
    expect(buildStarterVariant(BASE_RESUME, profile)).toMatchObject({
      label: "Professional introduction",
      ctaEmphasis: "Built to make your work clear to any new professional contact.",
    });
  });
});
