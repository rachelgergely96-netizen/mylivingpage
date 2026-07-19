import type { ResumeData } from "@/types/resume";

export const LIVING_PAGE_SECTION_LABELS = {
  summary: "Intro",
  stats: "Impact",
  proof: "Proof",
  testimonials: "Voices",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Credentials",
} as const;

export type LivingPageSectionId = keyof typeof LIVING_PAGE_SECTION_LABELS;

function hasRenderableProof(data: ResumeData): boolean {
  return Boolean(
    data.proofs?.some((proof) =>
      Boolean(
        proof &&
          (proof.title?.trim() ||
            proof.summary?.trim() ||
            proof.outcome?.trim() ||
            proof.url?.trim()),
      ),
    ),
  );
}

function hasRenderableTestimonial(data: ResumeData): boolean {
  return Boolean(
    data.testimonials?.some(
      (testimonial) =>
        testimonial &&
        testimonial.status === "approved" &&
        testimonial.name?.trim() &&
        testimonial.quote?.trim(),
    ),
  );
}

/** Mirrors the sections rendered by the full public ResumeLayout. */
export function getLivingPageSectionIds(data: ResumeData): LivingPageSectionId[] {
  const sections: LivingPageSectionId[] = [];

  if (data.summary) sections.push("summary");
  if (data.stats?.length) sections.push("stats");
  if (hasRenderableProof(data)) sections.push("proof");
  if (hasRenderableTestimonial(data)) sections.push("testimonials");
  if (data.experience?.length) sections.push("experience");
  if (data.projects?.length) sections.push("projects");
  if (data.education?.length) sections.push("education");
  if (data.skills?.length) sections.push("skills");
  if (data.certifications?.length) sections.push("certifications");

  return sections;
}
