import type {
  AtsExportCheck,
  AtsIssue,
  AtsIssueSeverity,
  AtsReviewSnapshot,
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
      applyData: {},
    });
  }

  return suggestions;
}

export function createRuleBasedAtsReview(input: {
  data: ResumeData;
  targeting?: Partial<AtsTargeting>;
  exportCheck: AtsExportCheck;
  appliedSuggestionIds?: string[];
  aiSuggestions?: AtsSuggestion[];
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

  const searchableText = collectSearchableText(normalizedData);
  const issues: AtsIssue[] = [];
  const problematicPunctuation = collectProblematicPunctuation(normalizedData);

  if (!normalizedData.headline) {
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
    !includesExactPhrase(normalizedData.headline.toLowerCase(), targeting.primaryTitle.toLowerCase())
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

  if (targeting.titleVariants.length === 0) {
    issues.push({
      id: "missing-title-variants",
      category: "recruiter_searchability",
      severity: "info",
      title: "Add title variants for adjacent recruiter searches",
      description: "A small set of nearby titles helps you pressure-test whether your wording covers common search variations.",
      field: "targeting",
      suggestedFix: "Add up to two role variations you also want to show up for.",
    });
  }

  if (countExplicitSkillItems(normalizedData) < 6) {
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

  if (!normalizedData.email && !normalizedData.linkedin && !normalizedData.github && !normalizedData.website) {
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

  if (!input.exportCheck.fitsOnOnePage) {
    issues.push({
      id: "pdf-overflow",
      category: "one_page_pdf",
      severity: "critical",
      title: "The ATS PDF is still over one page",
      description:
        input.exportCheck.overflowReasons[0] ??
        "The exported resume still needs trimming before it can become a one-page ATS-safe PDF.",
      field: "summary",
      suggestedFix: input.exportCheck.recommendedFixes[0] ?? "Trim lower-priority sections and shorten long bullets.",
    });
  }

  const suggestions = dedupe([
    ...buildRuleSuggestions(normalizedData, targeting, input.exportCheck),
    ...(input.aiSuggestions ?? []),
  ].map((suggestion) => suggestion.id)).map((id) => {
    return [...buildRuleSuggestions(normalizedData, targeting, input.exportCheck), ...(input.aiSuggestions ?? [])].find(
      (suggestion) => suggestion.id === id,
    ) as AtsSuggestion;
  });

  const score = buildScores(issues);

  return {
    targeting,
    score,
    issues,
    suggestions,
    appliedSuggestionIds: input.appliedSuggestionIds ?? [],
    exportCheck: input.exportCheck,
    lastReviewedAt: new Date().toISOString(),
    contentHash: buildResumeContentHash(normalizedData, targeting),
    source: input.aiSuggestions?.length ? "rules+ai" : "rules",
  } satisfies AtsReviewSnapshot;
}
