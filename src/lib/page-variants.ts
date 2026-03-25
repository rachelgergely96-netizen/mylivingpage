import type {
  PageConfig,
  PageVariant,
  PageVariantSectionId,
  ResumeData,
} from "@/types/resume";

export const MAX_PAGE_VARIANTS = 3;
export const PAGE_VARIANT_SECTION_IDS: PageVariantSectionId[] = [
  "summary",
  "stats",
  "experience",
  "projects",
  "skills",
  "education",
  "certifications",
];

export interface RecruiterSkimModel {
  variantLabel: string;
  collapsedChips: string[];
  roleHeading: string | null;
  summary: string | null;
  featuredProject: ResumeData["projects"][number] | null;
  ctaEmphasis: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown) {
  const text = toText(value);
  return text.length > 0 ? text : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toText(entry))
    .filter((entry, index, collection) => entry.length > 0 && collection.indexOf(entry) === index);
}

function toSectionOrder(value: unknown) {
  const sections = toStringArray(value).filter((entry): entry is PageVariantSectionId =>
    PAGE_VARIANT_SECTION_IDS.includes(entry as PageVariantSectionId),
  );

  if (!sections.length) {
    return [...PAGE_VARIANT_SECTION_IDS];
  }

  return [
    ...sections,
    ...PAGE_VARIANT_SECTION_IDS.filter((section) => !sections.includes(section)),
  ];
}

export function slugifyVariantLabel(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "targeted-version";
}

export function createPageVariantId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `variant-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPageVariant(baseData: ResumeData, label = "Targeted version"): PageVariant {
  return {
    id: createPageVariantId(),
    slug: slugifyVariantLabel(label),
    label,
    roleTitle: baseData.headline || "",
    headline: baseData.headline || null,
    summary: baseData.summary || null,
    featuredStatLabels: baseData.stats.slice(0, 3).map((stat) => stat.label),
    featuredProjectNames: baseData.projects.slice(0, 1).map((project) => project.name),
    sectionOrder: [...PAGE_VARIANT_SECTION_IDS],
    ctaEmphasis: null,
  };
}

export function sanitizePageVariant(value: unknown): PageVariant | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toText(value.id);
  const label = toText(value.label);

  if (!id || !label) {
    return null;
  }

  return {
    id,
    slug: slugifyVariantLabel(toText(value.slug) || label),
    label,
    roleTitle: toText(value.roleTitle),
    headline: toOptionalText(value.headline),
    summary: toOptionalText(value.summary),
    featuredStatLabels: toStringArray(value.featuredStatLabels),
    featuredProjectNames: toStringArray(value.featuredProjectNames),
    sectionOrder: toSectionOrder(value.sectionOrder),
    ctaEmphasis: toOptionalText(value.ctaEmphasis),
  };
}

export function sanitizePageVariants(value: unknown, maxVariants = MAX_PAGE_VARIANTS) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => sanitizePageVariant(entry))
    .filter((entry): entry is PageVariant => entry !== null)
    .slice(0, maxVariants);
}

export function getPageVariants(
  pageConfig: PageConfig | null | undefined,
  maxVariants = MAX_PAGE_VARIANTS,
) {
  return sanitizePageVariants(pageConfig?.variants ?? [], maxVariants);
}

export function getPageVariant(
  pageConfig: PageConfig | null | undefined,
  variantId: string | null | undefined,
  maxVariants = MAX_PAGE_VARIANTS,
) {
  if (!variantId) {
    return null;
  }

  return getPageVariants(pageConfig, maxVariants).find((variant) => variant.id === variantId) ?? null;
}

function cloneResumeData(data: ResumeData): ResumeData {
  return {
    ...data,
    experience: data.experience.map((entry) => ({ ...entry, highlights: [...entry.highlights] })),
    education: data.education.map((entry) => ({ ...entry })),
    projects: data.projects.map((entry) => ({ ...entry, tech: [...entry.tech] })),
    skills: data.skills.map((entry) => ({ ...entry, items: [...entry.items] })),
    certifications: data.certifications.map((entry) => ({ ...entry })),
    stats: data.stats.map((entry) => ({ ...entry })),
    proofs: (data.proofs ?? []).map((entry) => ({ ...entry })),
    testimonials: (data.testimonials ?? []).map((entry) => ({ ...entry })),
  };
}

function prioritizeByNames<T extends { label?: string; name?: string }>(
  entries: T[],
  prioritizedNames: string[],
) {
  if (!prioritizedNames.length) {
    return entries;
  }

  const priority = new Map(prioritizedNames.map((name, index) => [name.toLowerCase(), index]));
  return [...entries].sort((left, right) => {
    const leftIndex =
      priority.get((left.label ?? left.name ?? "").toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex =
      priority.get((right.label ?? right.name ?? "").toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return (left.label ?? left.name ?? "").localeCompare(right.label ?? right.name ?? "");
  });
}

export function applyPageVariant(baseData: ResumeData, variant: PageVariant | null | undefined) {
  if (!variant) {
    return cloneResumeData(baseData);
  }

  const next = cloneResumeData(baseData);

  if (variant.headline) {
    next.headline = variant.headline;
  } else if (variant.roleTitle) {
    next.headline = variant.roleTitle;
  }

  if (variant.summary) {
    next.summary = variant.summary;
  }

  if (variant.featuredStatLabels.length > 0) {
    next.stats = prioritizeByNames(next.stats, variant.featuredStatLabels);
  }

  if (variant.featuredProjectNames.length > 0) {
    next.projects = prioritizeByNames(next.projects, variant.featuredProjectNames);
  }

  return next;
}

export function buildVariantHref(
  livePath: string,
  options?: {
    variantId?: string | null;
    scenario?: string | null;
    shareLinkId?: string | null;
  },
) {
  const url = new URL(livePath, "https://www.mylivingpage.com");
  if (options?.variantId) {
    url.searchParams.set("v", options.variantId);
  }
  if (options?.scenario) {
    url.searchParams.set("s", options.scenario);
  }
  if (options?.shareLinkId) {
    url.searchParams.set("sl", options.shareLinkId);
  }

  return `${url.pathname}${url.search}`;
}

function pickFeaturedHighlight(data: ResumeData) {
  const quantified = data.experience
    .flatMap((entry) => entry.highlights)
    .find((highlight) => /\d/.test(highlight));

  return quantified ?? data.experience.flatMap((entry) => entry.highlights)[0] ?? null;
}

function buildProofPoints(data: ResumeData, featuredStatLabels: string[]) {
  const proofOutcomes = (data.proofs ?? [])
    .map((proof) => proof.outcome || proof.title)
    .filter((entry) => entry.trim().length > 0);
  const featuredStats = featuredStatLabels.length
    ? data.stats.filter((stat) => featuredStatLabels.includes(stat.label)).slice(0, 3)
    : data.stats.slice(0, 3);

  if (proofOutcomes.length > 0) {
    return proofOutcomes.slice(0, 3);
  }

  return featuredStats.length > 0
    ? featuredStats.map((stat) => `${stat.value} ${stat.label}`.trim())
    : [pickFeaturedHighlight(data)].filter((entry): entry is string => Boolean(entry));
}

function pickFeaturedProject(data: ResumeData, featuredProjectNames: string[]) {
  return featuredProjectNames.length
    ? data.projects.find((project) => featuredProjectNames.includes(project.name)) ?? data.projects[0] ?? null
    : data.projects[0] ?? null;
}

function equalStringArrays(left: string[], right: string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, collection) => value.length > 0 && collection.indexOf(value) === index);
}

export function buildRecruiterSkimModel(
  baseData: ResumeData,
  variant: PageVariant | null | undefined,
) : RecruiterSkimModel | null {
  if (!variant) {
    return null;
  }

  const data = applyPageVariant(baseData, variant);
  const baseRoleHeading = toText(baseData.headline) || "Professional profile";
  const variantRoleTitle = toText(variant.roleTitle);
  const variantHeadline = toText(data.headline);
  const roleHeading =
    variantRoleTitle && variantRoleTitle !== baseRoleHeading
      ? variantRoleTitle
      : variantHeadline && variantHeadline !== baseRoleHeading
        ? variantHeadline
        : null;
  const summary = toText(data.summary) !== toText(baseData.summary) ? data.summary : null;
  const ctaEmphasis = toOptionalText(variant.ctaEmphasis);
  const proofPoints = buildProofPoints(data, variant.featuredStatLabels);
  const baseProofPoints = buildProofPoints(baseData, []);
  const changedProofPoints = equalStringArrays(proofPoints, baseProofPoints) ? [] : proofPoints;
  const featuredProject = pickFeaturedProject(data, variant.featuredProjectNames);
  const baseFeaturedProject = pickFeaturedProject(baseData, []);
  const changedFeaturedProject =
    featuredProject?.name && featuredProject.name !== baseFeaturedProject?.name ? featuredProject : null;

  if (!roleHeading && !summary && !ctaEmphasis && !changedProofPoints.length && !changedFeaturedProject) {
    return null;
  }

  return {
    variantLabel: variant.label,
    collapsedChips: uniqueStrings([
      ...(roleHeading ? [roleHeading] : []),
      ...changedProofPoints,
      ...(changedFeaturedProject ? [`Featured work: ${changedFeaturedProject.name}`] : []),
      ...(ctaEmphasis ? [ctaEmphasis] : []),
    ]),
    roleHeading,
    summary,
    featuredProject: changedFeaturedProject,
    ctaEmphasis,
  };
}
