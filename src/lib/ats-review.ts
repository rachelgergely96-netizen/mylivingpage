import type {
  AtsChangeSummaryItem,
  AtsExportCheck,
  AtsIssue,
  AtsProposalDecision,
  AtsProposalGroup,
  AtsProposalSection,
  AtsIssueSeverity,
  AtsReviewMode,
  AtsReviewSnapshot,
  AtsScoreBreakdown,
  AtsScoreDimension,
  AtsSuggestion,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";

const ASCII_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u2032]/g, "'"],
  [/[\u201C\u201D\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/[\u2022\u2023\u25E6\u2043\u00B7]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00A0/g, " "],
  [/â€¢/g, "-"],
  [/Â·/g, "-"],
  [/â€”|â€“|â€"/g, "-"],
];

const STOPWORDS = new Set([
  "and",
  "the",
  "with",
  "that",
  "this",
  "from",
  "your",
  "have",
  "will",
  "for",
  "into",
  "are",
  "our",
  "you",
  "using",
  "use",
  "used",
  "about",
  "over",
  "than",
  "their",
  "they",
  "them",
  "must",
  "need",
  "needs",
  "nice",
  "plus",
  "such",
  "able",
  "ability",
  "strong",
  "years",
  "year",
  "role",
  "work",
  "team",
]);

const ABBREVIATION_PAIRS: Array<{ abbreviation: string; full: string }> = [
  { abbreviation: "UX", full: "User Experience" },
  { abbreviation: "UI", full: "User Interface" },
  { abbreviation: "PM", full: "Product Manager" },
  { abbreviation: "SEO", full: "Search Engine Optimization" },
  { abbreviation: "SEM", full: "Search Engine Marketing" },
  { abbreviation: "SaaS", full: "Software as a Service" },
  { abbreviation: "API", full: "Application Programming Interface" },
  { abbreviation: "SQL", full: "Structured Query Language" },
  { abbreviation: "AI", full: "Artificial Intelligence" },
];

export const ATS_RELEVANT_FIELDS: Array<keyof ResumeData> = [
  "name",
  "headline",
  "location",
  "email",
  "linkedin",
  "github",
  "website",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
];

const ATS_PROPOSAL_PRIORITY: AtsProposalGroup[] = [
  "contact",
  "headline",
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications",
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesExactPhrase(haystack: string, phrase: string) {
  if (!phrase.trim()) {
    return false;
  }

  return new RegExp(`(^|[^a-z0-9+/#.-])${escapeRegExp(phrase.toLowerCase())}([^a-z0-9+/#.-]|$)`, "i").test(
    haystack,
  );
}

function trimSentence(value: string, maxLength: number) {
  const clean = normalizeAtsText(value).trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  const sentences = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  let next = "";
  for (const sentence of sentences) {
    const candidate = `${next} ${sentence}`.trim();
    if (candidate.length > maxLength && next) {
      break;
    }
    next = candidate;
    if (candidate.length >= maxLength) {
      break;
    }
  }

  if (next && next.length <= maxLength) {
    return next.trim();
  }

  return `${clean.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function normalizeSkillGroups(skills: ResumeData["skills"]) {
  return skills
    .map((group) => ({
      category: normalizeAtsText(group.category || "General").trim() || "General",
      items: dedupe(group.items.map((item) => normalizeAtsText(item).trim())).filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
}

function stringifyContact(value: string | null, kind: "linkedin" | "github" | "website") {
  if (!value) {
    return "";
  }

  const clean = normalizeAtsText(value).trim();

  if (kind === "linkedin") {
    return clean.replace(/^https?:\/\//i, "");
  }

  if (kind === "github") {
    if (clean.startsWith("http")) {
      return clean.replace(/^https?:\/\//i, "");
    }
    if (/^github\.com\//i.test(clean)) {
      return clean;
    }
    return `github.com/${clean.replace(/^@/, "")}`;
  }

  return clean.replace(/^https?:\/\//i, "");
}

export function normalizeAtsText(value: string) {
  return ASCII_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), value)
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeResumeDataForAts(data: ResumeData): ResumeData {
  return {
    ...data,
    name: normalizeAtsText(data.name),
    headline: normalizeAtsText(data.headline),
    location: normalizeAtsText(data.location),
    email: data.email ? normalizeAtsText(data.email) : null,
    linkedin: data.linkedin ? stringifyContact(data.linkedin, "linkedin") : null,
    github: data.github ? stringifyContact(data.github, "github") : null,
    website: data.website ? stringifyContact(data.website, "website") : null,
    summary: normalizeAtsText(data.summary),
    experience: data.experience.map((entry) => ({
      ...entry,
      title: normalizeAtsText(entry.title),
      company: normalizeAtsText(entry.company),
      dates: normalizeAtsText(entry.dates),
      highlights: entry.highlights.map((highlight) => normalizeAtsText(highlight)).filter(Boolean),
      url: entry.url ? normalizeAtsText(entry.url) : null,
    })),
    education: data.education.map((entry) => ({
      degree: normalizeAtsText(entry.degree),
      school: normalizeAtsText(entry.school),
      year: normalizeAtsText(entry.year),
    })),
    projects: data.projects.map((project) => ({
      ...project,
      name: normalizeAtsText(project.name),
      description: normalizeAtsText(project.description),
      tech: dedupe(project.tech.map((item) => normalizeAtsText(item))),
      url: project.url ? normalizeAtsText(project.url) : null,
    })),
    skills: normalizeSkillGroups(data.skills),
    certifications: data.certifications.map((cert) => ({
      name: normalizeAtsText(cert.name),
      issuer: cert.issuer ? normalizeAtsText(cert.issuer) : null,
      date: cert.date ? normalizeAtsText(cert.date) : null,
    })),
    stats: data.stats.map((stat) => ({
      value: normalizeAtsText(stat.value),
      label: normalizeAtsText(stat.label),
    })),
  };
}

export function getDefaultAtsTargeting(data: ResumeData): AtsTargeting {
  const normalized = normalizeResumeDataForAts(data);
  const headlineSeed = normalized.headline.split(/[|/,-]/).map((part) => part.trim()).find(Boolean) ?? normalized.headline;
  const titleVariants = normalized.experience
    .map((entry) => entry.title)
    .filter((title) => title && title.toLowerCase() !== headlineSeed.toLowerCase())
    .slice(0, 2);

  return {
    primaryTitle: headlineSeed,
    titleVariants,
    jobDescription: "",
    lastExtractedKeywords: [],
  };
}

export function getAtsRelevantResumeData(data: ResumeData) {
  return {
    name: data.name,
    headline: data.headline,
    location: data.location,
    email: data.email,
    linkedin: data.linkedin,
    github: data.github,
    website: data.website,
    summary: data.summary,
    experience: data.experience,
    education: data.education,
    projects: data.projects,
    skills: data.skills,
    certifications: data.certifications,
  };
}

export function buildAtsRelevantFingerprint(data: ResumeData) {
  return JSON.stringify(getAtsRelevantResumeData(normalizeResumeDataForAts(data)));
}

function formatProposalGroupLabel(group: AtsProposalGroup) {
  switch (group) {
    case "contact":
      return "Contact";
    case "headline":
      return "Headline";
    case "summary":
      return "Summary";
    case "skills":
      return "Skills";
    case "experience":
      return "Experience";
    case "education":
      return "Education";
    case "projects":
      return "Projects";
    case "certifications":
      return "Certifications";
  }
}

function formatEmptyState(group: AtsProposalGroup) {
  if (group === "contact") {
    return "No direct contact details listed yet.";
  }
  return `No ${formatProposalGroupLabel(group).toLowerCase()} listed yet.`;
}

function formatContactText(data: ResumeData) {
  const lines = [
    data.location,
    data.email ?? "",
    data.linkedin ?? "",
    data.github ?? "",
    data.website ?? "",
  ]
    .map((item) => normalizeAtsText(item ?? ""))
    .filter(Boolean);

  return lines.join("\n") || formatEmptyState("contact");
}

function formatHeadlineText(data: ResumeData) {
  return normalizeAtsText(data.headline) || formatEmptyState("headline");
}

function formatSummaryText(data: ResumeData) {
  return normalizeAtsText(data.summary) || formatEmptyState("summary");
}

function formatSkillsText(data: ResumeData) {
  const lines = normalizeSkillGroups(data.skills).map((group) => `${group.category}: ${group.items.join(", ")}`);
  return lines.join("\n") || formatEmptyState("skills");
}

function formatExperienceText(data: ResumeData) {
  const lines = data.experience.map((entry) => {
    const headline = [entry.title, entry.company, entry.dates].map((item) => normalizeAtsText(item)).filter(Boolean).join(" | ");
    const highlights = entry.highlights.map((highlight) => `- ${normalizeAtsText(highlight)}`);
    return [headline, ...highlights].filter(Boolean).join("\n");
  });
  return lines.join("\n\n") || formatEmptyState("experience");
}

function formatEducationText(data: ResumeData) {
  const lines = data.education.map((entry) =>
    [normalizeAtsText(entry.degree), normalizeAtsText(entry.school), normalizeAtsText(entry.year)]
      .filter(Boolean)
      .join(" | "),
  );
  return lines.join("\n") || formatEmptyState("education");
}

function formatProjectsText(data: ResumeData) {
  const lines = data.projects.map((project) =>
    [
      normalizeAtsText(project.name),
      normalizeAtsText(project.description),
      project.tech.length ? `Tech: ${project.tech.map((item) => normalizeAtsText(item)).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return lines.join("\n\n") || formatEmptyState("projects");
}

function formatCertificationsText(data: ResumeData) {
  const lines = data.certifications.map((certification) =>
    [normalizeAtsText(certification.name), normalizeAtsText(certification.issuer ?? ""), normalizeAtsText(certification.date ?? "")]
      .filter(Boolean)
      .join(" | "),
  );
  return lines.join("\n") || formatEmptyState("certifications");
}

function formatProposalText(data: ResumeData, group: AtsProposalGroup) {
  switch (group) {
    case "contact":
      return formatContactText(data);
    case "headline":
      return formatHeadlineText(data);
    case "summary":
      return formatSummaryText(data);
    case "skills":
      return formatSkillsText(data);
    case "experience":
      return formatExperienceText(data);
    case "education":
      return formatEducationText(data);
    case "projects":
      return formatProjectsText(data);
    case "certifications":
      return formatCertificationsText(data);
  }
}

function pickProposalPatch(data: ResumeData, group: AtsProposalGroup): Partial<ResumeData> {
  switch (group) {
    case "contact":
      return {
        location: data.location,
        email: data.email,
        linkedin: data.linkedin,
        github: data.github,
        website: data.website,
      };
    case "headline":
      return { headline: data.headline };
    case "summary":
      return { summary: data.summary };
    case "skills":
      return { skills: data.skills };
    case "experience":
      return { experience: data.experience };
    case "education":
      return { education: data.education };
    case "projects":
      return { projects: data.projects };
    case "certifications":
      return { certifications: data.certifications };
  }
}

function getChangedProposalGroups(base: ResumeData, next: ResumeData) {
  return ATS_PROPOSAL_PRIORITY.filter((group) => formatProposalText(base, group) !== formatProposalText(next, group));
}

function buildProposalTitle(group: AtsProposalGroup, suggestion: AtsSuggestion, changedGroupCount: number) {
  if (changedGroupCount === 1) {
    return suggestion.title;
  }
  return `Update ${formatProposalGroupLabel(group)}`;
}

function buildProposalSections(baseData: ResumeData, suggestions: AtsSuggestion[]) {
  const candidates = suggestions.flatMap((suggestion, index) => {
    const nextData = mergeResumePatch(baseData, suggestion.applyData);
    const changedGroups = getChangedProposalGroups(baseData, nextData);
    if (!changedGroups.length) {
      return [];
    }

    return changedGroups.map((group) => {
      const groupedNextData = mergeResumePatch(baseData, pickProposalPatch(nextData, group));
      return {
        proposal: {
          id: changedGroups.length > 1 ? `${suggestion.id}:${group}` : suggestion.id,
          group,
          title: buildProposalTitle(group, suggestion, changedGroups.length),
          reason: suggestion.description,
          beforeText: formatProposalText(baseData, group),
          afterText: formatProposalText(groupedNextData, group),
          applyData: pickProposalPatch(nextData, group),
          expectedIssueIds: suggestion.expectedIssueIds,
          expectedScoreDimensions: suggestion.expectedScoreDimensions,
          source: suggestion.source ?? "rules",
        } satisfies AtsProposalSection,
        groupPriority: ATS_PROPOSAL_PRIORITY.indexOf(group),
        changedGroupCount: changedGroups.length,
        sourcePriority: suggestion.source === "ai" ? 0 : 1,
        index,
      };
    });
  });

  const chosenByGroup = new Map<AtsProposalGroup, AtsProposalSection>();

  candidates
    .sort((left, right) => {
      if (left.groupPriority !== right.groupPriority) {
        return left.groupPriority - right.groupPriority;
      }
      if (left.changedGroupCount !== right.changedGroupCount) {
        return left.changedGroupCount - right.changedGroupCount;
      }
      if (left.sourcePriority !== right.sourcePriority) {
        return left.sourcePriority - right.sourcePriority;
      }
      return left.index - right.index;
    })
    .forEach((candidate) => {
      if (!chosenByGroup.has(candidate.proposal.group)) {
        chosenByGroup.set(candidate.proposal.group, candidate.proposal);
      }
    });

  return ATS_PROPOSAL_PRIORITY.flatMap((group) => {
    const proposal = chosenByGroup.get(group);
    if (!proposal || proposal.beforeText === proposal.afterText) {
      return [];
    }
    return [proposal];
  });
}

export function applyProposalSelection(
  baseData: ResumeData,
  proposals: AtsProposalSection[],
  acceptedProposalIds: string[],
) {
  const accepted = new Set(acceptedProposalIds);
  return proposals.reduce((nextData, proposal) => {
    if (!accepted.has(proposal.id)) {
      return nextData;
    }
    return mergeResumePatch(nextData, proposal.applyData);
  }, normalizeResumeDataForAts(baseData));
}

export function stampProposalDecision(
  review: AtsReviewSnapshot,
  decision: AtsProposalDecision,
): AtsReviewSnapshot {
  return {
    ...review,
    appliedSuggestionIds: decision.acceptedProposalIds,
    proposalDecision: decision,
  };
}

export function getAtsAvailabilityReason(review: Partial<AtsReviewSnapshot> | null | undefined) {
  return (
    review?.availabilityReason ??
    review?.approvedExportCheck?.recommendedFixes?.[0] ??
    review?.approvedExportCheck?.overflowReasons?.[0] ??
    review?.candidateExportCheck?.recommendedFixes?.[0] ??
    review?.candidateExportCheck?.overflowReasons?.[0] ??
    review?.exportCheck?.recommendedFixes?.[0] ??
    review?.exportCheck?.overflowReasons?.[0] ??
    "Rerun ATS review and save to rebuild your ATS PDF."
  );
}

export function hasApprovedAtsResume(review: Partial<AtsReviewSnapshot> | null | undefined) {
  return Boolean(review?.approvedResumeData && review?.approvedExportCheck?.fitsOnOnePage);
}

export function resolveEditableAtsResumeData(
  review: Partial<AtsReviewSnapshot> | null | undefined,
  fallbackData: ResumeData,
) {
  return normalizeResumeDataForAts(
    review?.approvedResumeData ??
      review?.candidateResumeData ??
      fallbackData,
  );
}

export function isAtsOutOfSync(
  review: Partial<AtsReviewSnapshot> | null | undefined,
  sourceData: ResumeData,
) {
  if (!review?.approvedResumeData || !review.approvedSourceFingerprint) {
    return false;
  }

  return review.approvedSourceFingerprint !== buildAtsRelevantFingerprint(sourceData);
}

export function inheritApprovedAtsResume(
  review: AtsReviewSnapshot,
  existing: Partial<AtsReviewSnapshot> | null | undefined,
): AtsReviewSnapshot {
  return {
    ...review,
    approvedResumeData: review.approvedResumeData ?? existing?.approvedResumeData ?? null,
    approvedExportCheck: review.approvedExportCheck ?? existing?.approvedExportCheck ?? null,
    approvedAt: review.approvedAt ?? existing?.approvedAt ?? null,
    approvedContentHash: review.approvedContentHash ?? existing?.approvedContentHash ?? null,
    approvedSourceFingerprint:
      review.approvedSourceFingerprint ?? existing?.approvedSourceFingerprint ?? null,
    availabilityReason: review.availabilityReason ?? existing?.availabilityReason ?? null,
  };
}

export function finalizeApprovedAtsResume(
  review: AtsReviewSnapshot,
  data: ResumeData,
  approvedSourceFingerprint?: string | null,
): AtsReviewSnapshot {
  return {
    ...review,
    approvedResumeData: normalizeResumeDataForAts(data),
    approvedExportCheck: review.exportCheck,
    approvedAt: new Date().toISOString(),
    approvedContentHash: review.contentHash,
    approvedSourceFingerprint: approvedSourceFingerprint ?? review.approvedSourceFingerprint ?? null,
    availabilityReason: review.exportCheck.fitsOnOnePage ? null : getAtsAvailabilityReason(review),
  };
}

export function approveCandidateAtsResume(
  review: AtsReviewSnapshot,
  approvedSourceFingerprint?: string | null,
): AtsReviewSnapshot {
  if (!review.candidateResumeData) {
    return {
      ...review,
      approvedResumeData: null,
      approvedExportCheck: null,
      approvedAt: null,
      approvedContentHash: null,
      approvedSourceFingerprint: review.approvedSourceFingerprint ?? null,
      availabilityReason: getAtsAvailabilityReason({
        ...review,
        exportCheck: review.candidateExportCheck ?? review.exportCheck,
      }),
    };
  }

  return {
    ...review,
    approvedResumeData: normalizeResumeDataForAts(review.candidateResumeData),
    approvedExportCheck: review.candidateExportCheck ?? review.exportCheck,
    approvedAt: new Date().toISOString(),
    approvedContentHash: buildResumeContentHash(review.candidateResumeData, review.targeting),
    approvedSourceFingerprint: approvedSourceFingerprint ?? review.approvedSourceFingerprint ?? null,
    availabilityReason:
      review.candidateExportCheck?.fitsOnOnePage
        ? null
        : getAtsAvailabilityReason({
            ...review,
            exportCheck: review.candidateExportCheck ?? review.exportCheck,
          }),
  };
}

export function mergeResumePatch(base: ResumeData, patch: Partial<ResumeData>) {
  const next: ResumeData = {
    ...base,
    ...patch,
  };

  return normalizeResumeDataForAts(next);
}

export function buildResumeContentHash(data: ResumeData, targeting: AtsTargeting) {
  const source = JSON.stringify({
    data: normalizeResumeDataForAts(data),
    targeting,
  });

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  return `${Math.abs(hash)}`;
}

export function extractJobKeywords(jobDescription: string) {
  const normalized = normalizeAtsText(jobDescription);
  const tokens = normalized
    .split(/[\n,;:/()]+/)
    .flatMap((part) => part.split(/\s+/))
    .map((token) => token.replace(/[^A-Za-z0-9+/#.-]/g, ""))
    .filter((token) => token.length >= 2)
    .filter((token) => !STOPWORDS.has(token.toLowerCase()));

  return dedupe(tokens).slice(0, 12);
}

function collectSearchableText(data: ResumeData) {
  return normalizeAtsText(
    [
      data.headline,
      data.summary,
      ...data.experience.flatMap((entry) => [entry.title, entry.company, ...entry.highlights]),
      ...data.skills.flatMap((group) => [group.category, ...group.items]),
      ...data.projects.flatMap((project) => [project.name, project.description, ...project.tech]),
      ...data.education.flatMap((entry) => [entry.degree, entry.school]),
      ...data.certifications.flatMap((entry) => [entry.name, entry.issuer ?? "", entry.date ?? ""]),
    ].join(" "),
  ).toLowerCase();
}

function countExplicitSkillItems(data: ResumeData) {
  return data.skills.reduce((count, group) => count + group.items.length, 0);
}

function collectProblematicPunctuation(data: ResumeData) {
  const source = JSON.stringify(data);
  const matches = source.match(/â€¢|Â·|â€”|â€“|[\u2018\u2019\u201C\u201D\u2022\u2023\u25E6\u2043\u00B7\u2013\u2014\u2212]/g);
  return dedupe(matches ?? []);
}

function collectTopSkillItems(data: ResumeData, maxItems = 4) {
  return dedupe(
    data.skills
      .flatMap((group) => group.items)
      .map((item) => normalizeAtsText(item))
      .filter(Boolean),
  ).slice(0, maxItems);
}

function getEffectivePrimaryTitle(data: ResumeData, targeting: AtsTargeting) {
  return normalizeAtsText(
    targeting.primaryTitle ||
      data.headline ||
      data.experience[0]?.title ||
      getDefaultAtsTargeting(data).primaryTitle,
  );
}

function buildOptimizedHeadline(data: ResumeData, targeting: AtsTargeting) {
  const currentHeadline = normalizeAtsText(data.headline);
  const primaryTitle = getEffectivePrimaryTitle(data, targeting);

  if (!primaryTitle) {
    return currentHeadline;
  }

  if (!currentHeadline) {
    return primaryTitle;
  }

  if (includesExactPhrase(currentHeadline.toLowerCase(), primaryTitle.toLowerCase())) {
    return currentHeadline;
  }

  return primaryTitle;
}

function buildOptimizedSummary(data: ResumeData, targeting: AtsTargeting, maxLength: number) {
  const primaryTitle = getEffectivePrimaryTitle(data, targeting);
  const summary = normalizeAtsText(data.summary);
  const topSkills = collectTopSkillItems(data, 3);
  const searchableLead = [primaryTitle, topSkills.length ? `with ${topSkills.join(", ")}` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const leadSentence = searchableLead
    ? `${searchableLead}${/[.!?]$/.test(searchableLead) ? "" : "."}`
    : "";

  if (!summary) {
    return trimSentence(leadSentence, maxLength);
  }

  const needsTitle = primaryTitle
    ? !includesExactPhrase(summary.toLowerCase(), primaryTitle.toLowerCase())
    : false;
  const candidate = needsTitle ? `${leadSentence} ${summary}`.trim() : summary;

  return trimSentence(candidate, maxLength);
}

function trimExperienceHighlights(
  data: ResumeData,
  limitForIndex: (index: number, entry: ResumeData["experience"][number]) => number,
) {
  return {
    ...data,
    experience: data.experience.map((entry, index) => ({
      ...entry,
      highlights: entry.highlights.slice(0, Math.max(1, limitForIndex(index, entry))),
    })),
  } satisfies ResumeData;
}

function trimProjectsForAts(data: ResumeData, maxProjects: number) {
  return {
    ...data,
    projects: data.projects.slice(0, Math.max(0, maxProjects)),
  } satisfies ResumeData;
}

function trimCertificationsForAts(data: ResumeData, maxCertifications: number) {
  return {
    ...data,
    certifications: data.certifications.slice(0, Math.max(0, maxCertifications)),
  } satisfies ResumeData;
}

function trimExperienceCountForAts(data: ResumeData, maxRoles: number) {
  const minRoles = Math.min(data.experience.length, 2);
  return {
    ...data,
    experience: data.experience.slice(0, Math.max(minRoles, maxRoles)),
  } satisfies ResumeData;
}

function trimSkillsForAts(data: ResumeData, maxItems: number) {
  const totalItems = data.skills.reduce((count, group) => count + group.items.length, 0);
  const minItems = Math.min(totalItems, 6);
  let remaining = Math.max(minItems, maxItems);
  const nextSkills = data.skills
    .map((group) => {
      if (remaining <= 0) {
        return null;
      }

      const items = group.items.slice(0, remaining);
      remaining -= items.length;

      return items.length
        ? {
            ...group,
            items,
          }
        : null;
    })
    .filter((group): group is ResumeData["skills"][number] => group !== null);

  return {
    ...data,
    skills: nextSkills,
  } satisfies ResumeData;
}

function summarizeCandidateChanges(baseData: ResumeData, candidateData: ResumeData) {
  const summary: AtsChangeSummaryItem[] = [];
  const changedHeadline = formatHeadlineText(baseData) !== formatHeadlineText(candidateData);
  const changedSummary = formatSummaryText(baseData) !== formatSummaryText(candidateData);
  const changedContact = formatContactText(baseData) !== formatContactText(candidateData);
  const changedExperience = formatExperienceText(baseData) !== formatExperienceText(candidateData);
  const changedProjects = formatProjectsText(baseData) !== formatProjectsText(candidateData);
  const changedCertifications =
    formatCertificationsText(baseData) !== formatCertificationsText(candidateData);
  const changedSkills = formatSkillsText(baseData) !== formatSkillsText(candidateData);

  if (changedHeadline || changedSummary || changedContact) {
    summary.push({
      id: "searchability-tightened",
      title: "Made the title and summary easier to find",
      description: "We tightened the ATS copy so the role, core skills, and contact details are clearer in recruiter search.",
      category: "recruiter_searchability",
    });
  }

  if (changedExperience) {
    summary.push({
      id: "experience-prioritized",
      title: "Tightened recent experience",
      description: "We kept the strongest recent role points and shortened the rest for one-page ATS fit.",
      category: "one_page_pdf",
    });
  }

  if (changedProjects || changedCertifications || changedSkills) {
    summary.push({
      id: "fit-trimmed",
      title: "Trimmed lower-priority details for fit",
      description: "We reduced extra projects, certifications, and skill detail so the ATS PDF stays on one page.",
      category: "one_page_pdf",
    });
  }

  return summary.slice(0, 3);
}

export async function buildAutoOptimizedAtsCandidate(input: {
  data: ResumeData;
  targeting: AtsTargeting;
  checkExport: (data: ResumeData) => Promise<AtsExportCheck>;
}) {
  const originalData = normalizeResumeDataForAts(input.data);
  let candidateResumeData = originalData;
  let candidateExportCheck = await input.checkExport(candidateResumeData);

  const maybeApply = async (nextData: ResumeData) => {
    const normalizedNext = normalizeResumeDataForAts(nextData);
    if (JSON.stringify(normalizedNext) === JSON.stringify(candidateResumeData)) {
      return false;
    }

    candidateResumeData = normalizedNext;
    candidateExportCheck = await input.checkExport(candidateResumeData);
    return true;
  };

  await maybeApply({
    ...candidateResumeData,
    headline: buildOptimizedHeadline(candidateResumeData, input.targeting),
    summary: buildOptimizedSummary(candidateResumeData, input.targeting, 240),
  });

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply({
      ...candidateResumeData,
      summary: buildOptimizedSummary(candidateResumeData, input.targeting, 180),
    });
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimExperienceHighlights(candidateResumeData, () => 2));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimExperienceHighlights(candidateResumeData, (index) => (index < 2 ? 2 : 1)));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimProjectsForAts(candidateResumeData, 2));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimProjectsForAts(candidateResumeData, 1));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimProjectsForAts(candidateResumeData, 1));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimProjectsForAts(candidateResumeData, 0));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimCertificationsForAts(candidateResumeData, 1));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimCertificationsForAts(candidateResumeData, 0));
  }

  if (!candidateExportCheck.fitsOnOnePage && candidateResumeData.experience.length > 4) {
    await maybeApply(trimExperienceCountForAts(candidateResumeData, 4));
  }

  if (!candidateExportCheck.fitsOnOnePage && candidateResumeData.experience.length > 3) {
    await maybeApply(trimExperienceCountForAts(candidateResumeData, 3));
  }

  if (!candidateExportCheck.fitsOnOnePage && candidateResumeData.experience.length > 2) {
    await maybeApply(trimExperienceCountForAts(candidateResumeData, 2));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimSkillsForAts(candidateResumeData, 12));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimSkillsForAts(candidateResumeData, 8));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimExperienceHighlights(candidateResumeData, () => 1));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply(trimSkillsForAts(candidateResumeData, 6));
  }

  if (!candidateExportCheck.fitsOnOnePage) {
    await maybeApply({
      ...candidateResumeData,
      summary: buildOptimizedSummary(candidateResumeData, input.targeting, 140),
    });
  }

  return {
    candidateResumeData,
    candidateExportCheck,
    changeSummary: summarizeCandidateChanges(originalData, candidateResumeData),
    status: candidateExportCheck.fitsOnOnePage ? ("ready" as const) : ("needs_attention" as const),
  };
}

function buildKeywordCoverageIssue(jobKeywords: string[], searchableText: string): AtsIssue | null {
  if (!jobKeywords.length) {
    return null;
  }

  const missing = jobKeywords.filter((keyword) => !includesExactPhrase(searchableText, keyword.toLowerCase()));
  if (!missing.length) {
    return null;
  }

  return {
    id: "job-keywords-missing",
    category: "recruiter_searchability",
    severity: missing.length > 4 ? "critical" : "warning",
    title: "Job-specific keywords are still missing",
    description: `These exact terms are not visible yet: ${missing.slice(0, 6).join(", ")}.`,
    field: "targeting",
    suggestedFix: "Add only the exact terms you can honestly support in the summary, skills, or role bullets.",
  };
}

function buildScores(issues: AtsIssue[]) {
  const initial = {
    machineReadability: 100,
    recruiterSearchability: 100,
    onePagePdf: 100,
  };

  const severityPenalty: Record<AtsIssueSeverity, number> = {
    info: 6,
    warning: 14,
    critical: 28,
  };

  for (const issue of issues) {
    const penalty = severityPenalty[issue.severity];
    if (issue.category === "machine_readability") {
      initial.machineReadability -= penalty;
    }
    if (issue.category === "recruiter_searchability") {
      initial.recruiterSearchability -= penalty;
    }
    if (issue.category === "one_page_pdf") {
      initial.onePagePdf -= penalty;
    }
  }

  const machineReadability = clampScore(initial.machineReadability);
  const recruiterSearchability = clampScore(initial.recruiterSearchability);
  const onePagePdf = clampScore(initial.onePagePdf);

  return {
    machineReadability,
    recruiterSearchability,
    onePagePdf,
    overall: clampScore((machineReadability + recruiterSearchability + onePagePdf) / 3),
  };
}

function buildSuggestionImpact(
  expectedIssueIds: string[],
  expectedScoreDimensions: AtsScoreDimension[],
) {
  return {
    expectedIssueIds,
    expectedScoreDimensions,
  };
}

export function evaluateSuggestionOutcome(input: {
  suggestion: AtsSuggestion;
  nextIssues: AtsIssue[];
  previousScore: AtsScoreBreakdown;
  nextScore: AtsScoreBreakdown;
}) {
  const nextIssueIds = new Set(input.nextIssues.map((issue) => issue.id));
  const confirmedIssueIds = input.suggestion.expectedIssueIds.filter((issueId) => !nextIssueIds.has(issueId));
  const remainingIssueIds = input.suggestion.expectedIssueIds.filter((issueId) => nextIssueIds.has(issueId));
  const improvedScoreDimensions = input.suggestion.expectedScoreDimensions.filter(
    (dimension) => input.nextScore[dimension] > input.previousScore[dimension],
  );

  return {
    confirmedIssueIds,
    remainingIssueIds,
    improvedScoreDimensions,
    status:
      confirmedIssueIds.length > 0 || improvedScoreDimensions.length > 0
        ? "confirmed"
        : "still_needs_work",
  } as const;
}

function buildRuleSuggestions(data: ResumeData, targeting: AtsTargeting, exportCheck: AtsExportCheck) {
  const suggestions: AtsSuggestion[] = [];
  const normalized = normalizeResumeDataForAts(data);
  const allSkillItems = normalized.skills.flatMap((group) => group.items);

  if (targeting.primaryTitle && !includesExactPhrase(normalized.headline.toLowerCase(), targeting.primaryTitle.toLowerCase())) {
    suggestions.push({
      id: "headline-primary-title",
      category: "recruiter_searchability",
      title: "Use the exact target title in your headline",
      description: "Recruiter searches are more likely to surface you when the primary title appears exactly and early.",
      applyLabel: "Use exact title",
      preview: targeting.primaryTitle,
      ...buildSuggestionImpact(
        ["missing-headline", "primary-title-not-explicit"],
        ["recruiterSearchability"],
      ),
      applyData: {
        headline: targeting.primaryTitle,
      },
    });
  }

  if (targeting.primaryTitle && !includesExactPhrase(normalized.summary.toLowerCase(), targeting.primaryTitle.toLowerCase())) {
    const nextSummary = trimSentence(
      `${targeting.primaryTitle} with ${allSkillItems.slice(0, 3).join(", ")} experience. ${normalized.summary}`.trim(),
      320,
    );

    suggestions.push({
      id: "summary-primary-title",
      category: "recruiter_searchability",
      title: "Make the target title explicit in your summary",
      description: "A summary that clearly names the role and core skills is easier to find and easier to trust.",
      applyLabel: "Update summary",
      preview: nextSummary,
      ...buildSuggestionImpact(["primary-title-not-explicit"], ["recruiterSearchability"]),
      applyData: {
        summary: nextSummary,
      },
    });
  }

  const problematic = collectProblematicPunctuation(normalized);
  if (problematic.length) {
    suggestions.push({
      id: "normalize-ascii-text",
      category: "machine_readability",
      title: "Normalize punctuation for ATS-safe export",
      description: "Plain ASCII punctuation avoids broken bullets and separator glyphs in generated PDFs.",
      applyLabel: "Normalize text",
      preview: "Replace decorative bullets, quotes, and dashes with plain text.",
      ...buildSuggestionImpact(["problematic-punctuation"], ["machineReadability"]),
      applyData: normalizeResumeDataForAts(normalized),
    });
  }

  if (normalized.summary.length > 320) {
    suggestions.push({
      id: "tighten-summary",
      category: "one_page_pdf",
      title: "Tighten the summary for one-page fit",
      description: "A shorter summary frees space for role bullets and exact skills without making the resume harder to scan.",
      applyLabel: "Shorten summary",
      preview: trimSentence(normalized.summary, 280),
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {
        summary: trimSentence(normalized.summary, 280),
      },
    });
  }

  if (normalized.projects.length > 2) {
    suggestions.push({
      id: "trim-projects",
      category: "one_page_pdf",
      title: "Keep the two strongest projects in the ATS PDF",
      description: "Projects are useful, but they are lower priority than experience and skills when space gets tight.",
      applyLabel: "Keep top 2 projects",
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {
        projects: normalized.projects.slice(0, 2),
      },
    });
  }

  if (normalized.certifications.length > 2) {
    suggestions.push({
      id: "trim-certifications",
      category: "one_page_pdf",
      title: "Keep only the most relevant certifications",
      description: "Reducing certification count can recover space without weakening core searchability.",
      applyLabel: "Keep top 2 certifications",
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {
        certifications: normalized.certifications.slice(0, 2),
      },
    });
  }

  if (normalized.experience.length > 4) {
    suggestions.push({
      id: "trim-experience-count",
      category: "one_page_pdf",
      title: "Keep the four strongest roles",
      description: "One-page resumes usually perform better when older roles move off the exported PDF first.",
      applyLabel: "Keep top 4 roles",
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {
        experience: normalized.experience.slice(0, 4),
      },
    });
  }

  if (normalized.experience.some((entry) => entry.highlights.length > 2)) {
    suggestions.push({
      id: "trim-bullet-count",
      category: "one_page_pdf",
      title: "Limit each role to the strongest two bullets",
      description: "Prioritize exact skills and metrics, and leave supporting detail for the page itself.",
      applyLabel: "Trim bullets",
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {
        experience: normalized.experience.map((entry) => ({
          ...entry,
          highlights: entry.highlights.slice(0, 2),
        })),
      },
    });
  }

  if (!exportCheck.fitsOnOnePage && !suggestions.some((suggestion) => suggestion.category === "one_page_pdf")) {
    suggestions.push({
      id: "one-page-review",
      category: "one_page_pdf",
      title: "Review lower-priority sections before exporting",
      description: "Projects, certifications, and long summaries usually need to tighten up first.",
      applyLabel: "Review sections",
      ...buildSuggestionImpact(["pdf-overflow"], ["onePagePdf"]),
      applyData: {},
    });
  }

  return suggestions;
}

export function createRuleBasedAtsReview(input: {
  data: ResumeData;
  targeting?: Partial<AtsTargeting>;
  exportCheck: AtsExportCheck;
  candidateResumeData?: ResumeData | null;
  candidateExportCheck?: AtsExportCheck | null;
  changeSummary?: AtsChangeSummaryItem[];
  status?: "ready" | "needs_attention";
  appliedSuggestionIds?: string[];
  aiSuggestions?: AtsSuggestion[];
  mode?: AtsReviewMode;
}) {
  const normalizedData = normalizeResumeDataForAts(input.data);
  const defaultTargeting = getDefaultAtsTargeting(normalizedData);
  const targeting: AtsTargeting = {
    ...defaultTargeting,
    ...input.targeting,
    titleVariants: dedupe((input.targeting?.titleVariants ?? defaultTargeting.titleVariants).map((item) => normalizeAtsText(item))).slice(0, 2),
    jobDescription: normalizeAtsText(input.targeting?.jobDescription ?? ""),
    lastExtractedKeywords: extractJobKeywords(input.targeting?.jobDescription ?? ""),
  };

  const reviewData = normalizeResumeDataForAts(input.candidateResumeData ?? normalizedData);
  const reviewExportCheck = input.candidateExportCheck ?? input.exportCheck;
  const searchableText = collectSearchableText(reviewData);
  const issues: AtsIssue[] = [];
  const problematicPunctuation = collectProblematicPunctuation(reviewData);

  if (!reviewData.headline) {
    issues.push({
      id: "missing-headline",
      category: "recruiter_searchability",
      severity: "critical",
      title: "Add a clear professional headline",
      description: "Your headline is the fastest place to show an exact searchable title.",
      field: "headline",
      suggestedFix: "Use the exact role you want recruiters to find.",
    });
  }

  if (!targeting.primaryTitle) {
    issues.push({
      id: "missing-primary-title",
      category: "recruiter_searchability",
      severity: "critical",
      title: "Choose a primary target title",
      description: "Without a target title, the review cannot tell whether your page and PDF are aligned to recruiter searches.",
      field: "targeting",
      suggestedFix: "Set one exact title you want to be found for first.",
    });
  } else if (
    !includesExactPhrase(searchableText, targeting.primaryTitle.toLowerCase()) &&
    !includesExactPhrase(reviewData.headline.toLowerCase(), targeting.primaryTitle.toLowerCase())
  ) {
    issues.push({
      id: "primary-title-not-explicit",
      category: "recruiter_searchability",
      severity: "critical",
      title: "The primary target title is not explicit enough",
      description: `Recruiters searching for "${targeting.primaryTitle}" may not surface you if that exact phrase never appears.`,
      field: "headline",
      suggestedFix: "Use the target title exactly in the headline or summary.",
    });
  }

  if (countExplicitSkillItems(reviewData) < 6) {
    issues.push({
      id: "skills-too-thin",
      category: "recruiter_searchability",
      severity: "warning",
      title: "Add more explicit skill names",
      description: "If the skills are only implied inside bullets, recruiter searches can miss you before a person clicks.",
      field: "skills",
      suggestedFix: "Name the tools, platforms, and domain skills directly in the skills section.",
    });
  }

  for (const pair of ABBREVIATION_PAIRS) {
    const hasAbbreviation = includesExactPhrase(searchableText, pair.abbreviation.toLowerCase());
    const hasFull = includesExactPhrase(searchableText, pair.full.toLowerCase());
    if (hasAbbreviation !== hasFull) {
      issues.push({
        id: `abbreviation-${pair.abbreviation.toLowerCase()}`,
        category: "recruiter_searchability",
        severity: "info",
        title: `Pair ${pair.full} with ${pair.abbreviation}`,
        description: "Including both the full term and the abbreviation gives you coverage across different search habits.",
        field: "summary",
        suggestedFix: `Use "${pair.full} (${pair.abbreviation})" once in a natural sentence.`,
      });
    }
  }

  if (problematicPunctuation.length) {
    issues.push({
      id: "problematic-punctuation",
      category: "machine_readability",
      severity: "warning",
      title: "Plain punctuation will export more reliably",
      description: `The current content still includes characters that often break during text extraction: ${problematicPunctuation.join(", ")}.`,
      field: "summary",
      suggestedFix: "Normalize bullets, dashes, and quotes before exporting the ATS PDF.",
    });
  }

  if (!reviewData.email && !reviewData.linkedin && !reviewData.github && !reviewData.website) {
    issues.push({
      id: "missing-contact",
      category: "machine_readability",
      severity: "warning",
      title: "Add at least one direct contact method",
      description: "Generated PDFs keep contact info in the document body, but there still needs to be something there to reach you.",
      field: "email",
      suggestedFix: "Add email or a professional profile link.",
    });
  }

  const keywordCoverageIssue = buildKeywordCoverageIssue(targeting.lastExtractedKeywords, searchableText);
  if (keywordCoverageIssue) {
    issues.push(keywordCoverageIssue);
  }

  if (!reviewExportCheck.fitsOnOnePage) {
    issues.push({
      id: "pdf-overflow",
      category: "one_page_pdf",
      severity: "critical",
      title: "The ATS PDF is still over one page",
      description:
        reviewExportCheck.overflowReasons[0] ??
        "The exported resume still needs trimming before it can become a one-page ATS-safe PDF.",
      field: "summary",
      suggestedFix: reviewExportCheck.recommendedFixes[0] ?? "Trim lower-priority sections and shorten long bullets.",
    });
  }

  const combinedSuggestions = [
    ...buildRuleSuggestions(reviewData, targeting, reviewExportCheck).map((suggestion) => ({
      ...suggestion,
      source: "rules" as const,
    })),
    ...(input.aiSuggestions ?? []).map((suggestion) => ({
      ...suggestion,
      source: suggestion.source ?? ("ai" as const),
    })),
  ];
  const suggestions = dedupe(combinedSuggestions.map((suggestion) => suggestion.id)).map((id) => {
    return combinedSuggestions.find((suggestion) => suggestion.id === id) as AtsSuggestion;
  });
  const proposals = buildProposalSections(reviewData, suggestions);

  const score = buildScores(issues);

  return {
    targeting,
    score,
    issues,
    suggestions,
    proposals,
    appliedSuggestionIds: input.appliedSuggestionIds ?? [],
    proposalDecision: {
      acceptedProposalIds: [],
      declinedProposalIds: [],
      lastDecisionAt: null,
    },
    exportCheck: input.exportCheck,
    candidateResumeData: reviewData,
    candidateExportCheck: reviewExportCheck,
    changeSummary: input.changeSummary ?? [],
    status: input.status ?? (reviewExportCheck.fitsOnOnePage ? "ready" : "needs_attention"),
    lastReviewedAt: new Date().toISOString(),
    contentHash: buildResumeContentHash(normalizedData, targeting),
    mode: input.mode ?? "full",
    source: input.aiSuggestions?.length ? "rules+ai" : "rules",
    approvedResumeData: null,
    approvedExportCheck: null,
    approvedAt: null,
    approvedContentHash: null,
    approvedSourceFingerprint: null,
    availabilityReason: null,
  } satisfies AtsReviewSnapshot;
}
