import type { PageRecord, ResumeData } from "@/types/resume";

/**
 * Structured data for a public Living Page: a schema.org ProfilePage whose
 * mainEntity is the Person the résumé describes. This is what lets recruiter
 * tooling, search engines, and AI agents read the page as a professional
 * profile instead of an anonymous document.
 *
 * Only data already rendered on the public page is emitted — the schema must
 * never widen what a viewer can see.
 */

interface LivingPageJsonLdInput {
  page: Pick<PageRecord, "published_at" | "created_at" | "updated_at">;
  resume: ResumeData;
  url: string;
}

function normalizeExternalUrl(value: string, fallbackPrefix?: string): string {
  if (value.startsWith("http")) return value;
  if (fallbackPrefix && !value.includes(".")) return `${fallbackPrefix}${value}`;
  return `https://${value}`;
}

function collectSameAs(resume: ResumeData): string[] {
  const links: string[] = [];
  if (resume.linkedin) links.push(normalizeExternalUrl(resume.linkedin));
  if (resume.github) {
    links.push(normalizeExternalUrl(resume.github, "https://github.com/"));
  }
  if (resume.website) links.push(normalizeExternalUrl(resume.website));
  return links;
}

function collectSkills(resume: ResumeData): string[] {
  if (!Array.isArray(resume.skills)) return [];
  // Legacy pages stored skills as string[]; new pages group them by category.
  const groups = resume.skills as Array<
    string | { category: string; items: string[] }
  >;
  return groups.flatMap((group) =>
    typeof group === "string" ? [group] : (group.items ?? []),
  );
}

export function buildLivingPageJsonLd({
  page,
  resume,
  url,
}: LivingPageJsonLdInput): Record<string, unknown> {
  const personId = `${url}#person`;
  const sameAs = collectSameAs(resume);
  const skills = collectSkills(resume);

  const person: Record<string, unknown> = {
    "@type": "Person",
    "@id": personId,
    name: resume.name,
    url,
  };

  if (resume.headline) person.jobTitle = resume.headline;
  if (resume.summary) person.description = resume.summary;
  if (resume.location) person.address = resume.location;
  if (resume.email) person.email = `mailto:${resume.email}`;
  if (resume.avatar_url) person.image = resume.avatar_url;
  if (sameAs.length) person.sameAs = sameAs;
  if (skills.length) person.knowsAbout = skills;

  const currentRole = resume.experience?.[0];
  if (currentRole?.company) {
    person.worksFor = {
      "@type": "Organization",
      name: currentRole.company,
      ...(currentRole.url
        ? { url: normalizeExternalUrl(currentRole.url) }
        : {}),
    };
  }

  if (resume.education?.length) {
    person.alumniOf = resume.education.map((education) => ({
      "@type": "EducationalOrganization",
      name: education.school,
    }));
  }

  // Legacy pages stored certifications as string[]; new pages use objects.
  const certifications = (
    (resume.certifications ?? []) as Array<
      string | { name: string; issuer: string | null }
    >
  )
    .map((certification) =>
      typeof certification === "string"
        ? { name: certification, issuer: null }
        : certification,
    )
    .filter((certification) => certification?.name);
  if (certifications.length) {
    person.hasCredential = certifications.map((certification) => ({
      "@type": "EducationalOccupationalCredential",
      name: certification.name,
      ...(certification.issuer
        ? {
            recognizedBy: {
              "@type": "Organization",
              name: certification.issuer,
            },
          }
        : {}),
    }));
  }

  const profilePage: Record<string, unknown> = {
    "@type": "ProfilePage",
    "@id": url,
    url,
    mainEntity: { "@id": personId },
    ...(page.published_at || page.created_at
      ? { datePublished: page.published_at ?? page.created_at }
      : {}),
    ...(page.updated_at ? { dateModified: page.updated_at } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [profilePage, person],
  };
}
