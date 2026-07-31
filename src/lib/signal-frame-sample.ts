import type { ResumeData } from "@/types/resume";

export const SIGNAL_FRAME_SAMPLE: ResumeData = {
  name: "Avery Morgan",
  headline: "Senior Product & Platform Lead",
  location: "New York, NY",
  email: "avery@sample.invalid",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary:
    "Product leader building large-scale platforms with cross-functional teams, clear systems, and measurable growth.",
  experience: [
    {
      title: "Senior Product Lead",
      company: "Northstar Systems",
      dates: "2022 - Present",
      highlights: [
        "Led a TypeScript and SQL platform serving 2M+ requests daily",
        "Reduced release time by 38% through a shared product and engineering operating model",
        "Set the platform strategy for a cross-functional group spanning product, design, and engineering",
      ],
      url: null,
    },
    {
      title: "Product Manager",
      company: "Harbor Product Studio",
      dates: "2019 - 2022",
      highlights: [
        "Turned customer research into a three-year platform roadmap",
        "Launched self-service workflows adopted by enterprise operations teams",
      ],
      url: null,
    },
  ],
  education: [
    {
      degree: "B.S. Information Systems",
      school: "Sample State University",
      year: "2019",
    },
  ],
  projects: [
    {
      name: "Platform Operating Model",
      description:
        "A shared planning and release system that made priorities, ownership, and measurable outcomes clear across teams.",
      tech: ["Product strategy", "TypeScript", "SQL"],
      url: null,
    },
  ],
  skills: [
    {
      category: "Product",
      items: ["Platform strategy", "Roadmapping", "Product operations"],
    },
    {
      category: "Technical",
      items: ["TypeScript", "SQL", "APIs", "Platform architecture"],
    },
    {
      category: "Leadership",
      items: ["Cross-functional leadership", "Team development", "Executive communication"],
    },
  ],
  certifications: [],
  stats: [
    { value: "2M+", label: "Requests / Day" },
    { value: "38%", label: "Faster Releases" },
    { value: "8+", label: "Years Experience" },
  ],
  proofs: [
    {
      id: "release-system-result",
      type: "quantified_result",
      title: "Release system redesign",
      summary:
        "Reframed planning, ownership, and release signals into one operating model shared across product and engineering.",
      outcome: "38% faster releases across the platform group.",
      url: null,
      source_label: "Operating metric",
    },
    {
      id: "platform-model-artifact",
      type: "project_artifact",
      title: "Platform operating model",
      summary:
        "A reusable decision and delivery framework built for cross-functional platform teams.",
      outcome: "Adopted as the working system for roadmap and release reviews.",
      url: null,
      source_label: "Selected work",
    },
  ],
  testimonials: [
    {
      id: "sample-leadership-quote",
      name: "Jordan Lee",
      role: "VP, Product",
      company: "Northstar Systems",
      relationship: "Executive partner",
      quote:
        "Avery turns complex platform work into a story teams can understand, trust, and act on.",
      status: "approved",
      requested_at: "2026-06-01",
      approved_at: "2026-06-03",
    },
  ],
};
