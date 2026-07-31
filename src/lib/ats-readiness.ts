import {
  buildAtsRelevantFingerprint,
  normalizeAtsExportCheck,
  normalizeAtsText,
  normalizeResumeDataForAts,
} from "@/lib/ats-review";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

export type AtsReadinessStatus = "ready" | "needs_attention" | "not_ready";
export type AtsReadinessCategory = "essentials" | "content" | "searchability" | "pdf";
export type AtsReadinessSeverity = "pass" | "info" | "warning" | "critical";

export interface AtsReadinessCheck {
  id: string;
  category: AtsReadinessCategory;
  title: string;
  detail: string;
  severity: AtsReadinessSeverity;
  passed: boolean;
  pointsDeducted: number;
  suggestedFix?: string;
}

export interface AtsKeywordCoverage {
  keywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  coveragePercent: number;
}

export interface AtsReadinessResult {
  status: AtsReadinessStatus;
  score: number;
  categoryScores: Record<AtsReadinessCategory, number>;
  checks: Record<AtsReadinessCategory, AtsReadinessCheck[]>;
  criticalFixes: AtsReadinessCheck[];
  improvements: AtsReadinessCheck[];
  passedChecks: AtsReadinessCheck[];
  pdf: {
    renderable: boolean;
    pageCount: number | null;
    fitsOnOnePage: boolean | null;
    renderFailureReason: string | null;
    overflowReasons: string[];
    recommendedFixes: string[];
  };
  keywordCoverage?: AtsKeywordCoverage;
  fingerprint: string;
  evaluatedAt: string | null;
  disclaimer: string;
}

export interface EvaluateAtsReadinessInput {
  data: ResumeData;
  exportCheck: AtsExportCheck;
  targetTitle?: string;
  jobDescription?: string;
  evaluatedAt?: string | null;
}

export const ATS_READINESS_DISCLAIMER =
  "This check reviews common ATS readability and résumé-writing practices. It cannot predict how a specific employer will rank your résumé or guarantee an interview.";

const CATEGORY_WEIGHTS: Record<AtsReadinessCategory, number> = {
  essentials: 0.35,
  content: 0.3,
  searchability: 0.2,
  pdf: 0.15,
};

const ACTION_VERBS = new Set([
  "accelerated",
  "achieved",
  "advised",
  "analyzed",
  "architected",
  "authored",
  "automated",
  "briefed",
  "built",
  "calculated",
  "championed",
  "closed",
  "coached",
  "collaborated",
  "conducted",
  "consolidated",
  "coordinated",
  "counseled",
  "created",
  "cut",
  "defended",
  "delivered",
  "deployed",
  "designed",
  "developed",
  "directed",
  "drafted",
  "drove",
  "edited",
  "enabled",
  "established",
  "evaluated",
  "executed",
  "expanded",
  "facilitated",
  "filed",
  "forecasted",
  "formed",
  "generated",
  "grew",
  "identified",
  "implemented",
  "improved",
  "increased",
  "investigated",
  "launched",
  "led",
  "litigated",
  "maintained",
  "managed",
  "mentored",
  "migrated",
  "modernized",
  "monitored",
  "negotiated",
  "optimized",
  "orchestrated",
  "owned",
  "oversaw",
  "partnered",
  "planned",
  "prepared",
  "presented",
  "produced",
  "prosecuted",
  "published",
  "reduced",
  "redesigned",
  "researched",
  "resolved",
  "reviewed",
  "revised",
  "scaled",
  "secured",
  "shipped",
  "simplified",
  "spearheaded",
  "streamlined",
  "supervised",
  "tested",
  "trained",
  "transformed",
  "translated",
  "validated",
  "won",
]);

const JOB_DESCRIPTION_STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "among",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "being",
  "but",
  "by",
  "can",
  "candidate",
  "candidates",
  "company",
  "could",
  "description",
  "duties",
  "each",
  "employer",
  "equal",
  "experience",
  "for",
  "from",
  "had",
  "has",
  "have",
  "hiring",
  "ideal",
  "in",
  "including",
  "into",
  "is",
  "it",
  "its",
  "job",
  "looking",
  "must",
  "need",
  "needs",
  "of",
  "on",
  "opportunity",
  "or",
  "our",
  "plus",
  "preferred",
  "qualifications",
  "required",
  "requirements",
  "responsibilities",
  "role",
  "seeking",
  "should",
  "skills",
  "strong",
  "team",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "through",
  "to",
  "using",
  "want",
  "we",
  "well",
  "who",
  "will",
  "with",
  "work",
  "working",
  "years",
  "you",
  "your",
]);

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function makeCheck(input: {
  id: string;
  category: AtsReadinessCategory;
  title: string;
  detail: string;
  passed: boolean;
  failureSeverity: Extract<AtsReadinessSeverity, "warning" | "critical">;
  deduction: number;
  suggestedFix?: string;
}): AtsReadinessCheck {
  return {
    id: input.id,
    category: input.category,
    title: input.title,
    detail: input.detail,
    severity: input.passed ? "pass" : input.failureSeverity,
    passed: input.passed,
    pointsDeducted: input.passed ? 0 : input.deduction,
    ...(input.suggestedFix ? { suggestedFix: input.suggestedFix } : {}),
  };
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function listExamples(values: string[], fallback: string) {
  if (values.length === 0) {
    return fallback;
  }

  return values.slice(0, 3).map((value) => `“${value}”`).join(", ");
}

function getOpeningWord(value: string) {
  return value.toLowerCase().match(/[a-z][a-z'-]*/)?.[0] ?? "";
}

function hasUsableEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value));
}

function hasUsableContactLink(value: string | null) {
  if (!value || /\s/.test(value)) {
    return false;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function classifyDateStyle(value: string) {
  if (/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(value)) {
    return "month-year";
  }

  if (/\b(?:0?[1-9]|1[0-2])[/.](?:19|20)\d{2}\b/.test(value)) {
    return "numeric-month-year";
  }

  if (/\b(?:19|20)\d{2}\b/.test(value)) {
    return "year";
  }

  return "unknown";
}

function normalizeSearchText(value: string) {
  return normalizeAtsText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesExactSearchTerm(corpus: string, term: string) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) {
    return false;
  }

  const paddedCorpus = ` ${corpus.replace(/[^a-z0-9+#./-]+/g, " ").replace(/\s+/g, " ").trim()} `;
  return paddedCorpus.includes(` ${normalizedTerm} `);
}

function buildSearchCorpus(data: ResumeData) {
  return normalizeSearchText(
    [
      data.headline,
      data.summary,
      ...data.experience.flatMap((entry) => [
        entry.title,
        entry.company,
        ...entry.highlights,
      ]),
      ...data.projects.flatMap((project) => [project.name, project.description, ...project.tech]),
      ...data.skills.flatMap((group) => [group.category, ...group.items]),
      ...data.education.flatMap((entry) => [entry.degree, entry.school]),
      ...data.certifications.flatMap((certification) => [
        certification.name,
        certification.issuer ?? "",
      ]),
    ].join(" "),
  );
}

const SHORT_TECH_TERMS = new Set(["go", "ai", "ml", "ui", "ux", "qa", "ci", "cd", "bi", "ar", "vr"]);

export function extractAtsJobKeywords(jobDescription: string, limit = 12) {
  const matches = normalizeSearchText(jobDescription).match(/c\+\+|c#|\.net|[a-z][a-z0-9+#.-]{1,}/g) ?? [];
  const firstSeen = new Map<string, number>();
  const counts = new Map<string, number>();

  matches.forEach((rawToken, index) => {
    const token = rawToken.replace(/^[./-]+|[./-]+$/g, "");
    if (
      (token.length < 3 && token !== "c#" && !SHORT_TECH_TERMS.has(token)) ||
      JOB_DESCRIPTION_STOPWORDS.has(token) ||
      /^\d+$/.test(token)
    ) {
      return;
    }

    if (!firstSeen.has(token)) {
      firstSeen.set(token, index);
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return Array.from(counts.keys())
    .sort((left, right) => {
      const frequencyDifference = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
      if (frequencyDifference !== 0) {
        return frequencyDifference;
      }

      return (firstSeen.get(left) ?? 0) - (firstSeen.get(right) ?? 0);
    })
    .slice(0, Math.max(0, limit));
}

function buildKeywordCoverage(data: ResumeData, jobDescription: string): AtsKeywordCoverage {
  const corpus = buildSearchCorpus(data);
  const keywords = extractAtsJobKeywords(jobDescription);
  const matchedKeywords = keywords.filter((keyword) => includesExactSearchTerm(corpus, keyword));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));

  return {
    keywords,
    matchedKeywords,
    missingKeywords,
    coveragePercent: keywords.length === 0 ? 100 : Math.round((matchedKeywords.length / keywords.length) * 100),
  };
}

export function buildAtsReadinessFingerprint(data: ResumeData) {
  return buildAtsRelevantFingerprint(data);
}

export function evaluateAtsReadiness(input: EvaluateAtsReadinessInput): AtsReadinessResult {
  const data = normalizeResumeDataForAts(input.data);
  const exportCheck = normalizeAtsExportCheck(input.exportCheck);
  const highlights = data.experience.flatMap((entry) => entry.highlights).filter(Boolean);
  const incompleteRoles = data.experience.filter(
    (entry) => !entry.title || !entry.company || !entry.dates,
  );
  const rolesWithoutHighlights = data.experience.filter((entry) => entry.highlights.length === 0);
  const contactIsUsable =
    hasUsableEmail(data.email) ||
    hasUsableContactLink(data.linkedin) ||
    hasUsableContactLink(data.github) ||
    hasUsableContactLink(data.website);
  const invalidContactLabels = [
    data.email && !hasUsableEmail(data.email) ? "email" : null,
    data.linkedin && !hasUsableContactLink(data.linkedin) ? "LinkedIn" : null,
    data.github && !hasUsableContactLink(data.github) ? "GitHub" : null,
    data.website && !hasUsableContactLink(data.website) ? "website" : null,
  ].filter((label): label is string => Boolean(label));

  const directLanguageProblems = highlights.filter((highlight) =>
    /\b(?:i|me|my|mine|we|our|ours|responsible for|duties included|tasked with|worked on|helped with)\b/i.test(
      highlight,
    ),
  );
  const weakActionOpenings = highlights.filter(
    (highlight) => !ACTION_VERBS.has(getOpeningWord(highlight)),
  );
  const lengthProblems = highlights.filter((highlight) => {
    const count = wordCount(highlight);
    return count < 6 || count > 45;
  });
  const openingCounts = new Map<string, number>();
  highlights.forEach((highlight) => {
    const opening = getOpeningWord(highlight);
    if (opening) {
      openingCounts.set(opening, (openingCounts.get(opening) ?? 0) + 1);
    }
  });
  const repeatedOpenings = Array.from(openingCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([opening]) => opening);
  const hasQuantifiedEvidence = highlights.some((highlight) =>
    /(?:\$|£|€|¥|%|\b\d+(?:[.,]\d+)?(?:k|m|b|x|\+)?\b|\b(?:million|billion|thousand)\b)/i.test(
      highlight,
    ),
  );
  const dateStyles = data.experience.map((entry) => classifyDateStyle(entry.dates));
  const recognizedDateStyles = new Set(dateStyles.filter((style) => style !== "unknown"));
  const datesAreConsistent = !dateStyles.includes("unknown") && recognizedDateStyles.size <= 1;
  const uniqueSkills = new Set(
    data.skills.flatMap((group) => group.items.map((item) => item.toLowerCase())),
  );
  const summaryLength = data.summary.length;

  const checks: Record<AtsReadinessCategory, AtsReadinessCheck[]> = {
    essentials: [
      makeCheck({
        id: "name-present",
        category: "essentials",
        title: "Your name is present",
        detail: data.name ? "Your résumé includes a clear candidate name." : "Your résumé does not include a candidate name.",
        passed: Boolean(data.name),
        failureSeverity: "critical",
        deduction: 25,
        suggestedFix: "Add your full professional name at the top of the résumé.",
      }),
      makeCheck({
        id: "usable-contact",
        category: "essentials",
        title: "A usable contact method is present",
        detail: contactIsUsable
          ? "Recruiters have at least one usable email address or professional link."
          : "No valid email address or professional web link was found.",
        passed: contactIsUsable,
        failureSeverity: "critical",
        deduction: 25,
        suggestedFix: "Add a valid email address or a full LinkedIn, GitHub, or portfolio link.",
      }),
      makeCheck({
        id: "contact-values-valid",
        category: "essentials",
        title: "Contact details use valid formats",
        detail:
          invalidContactLabels.length === 0
            ? "Every contact detail you supplied uses a valid email or web-address format."
            : `Check the format of your ${invalidContactLabels.join(", ")}${invalidContactLabels.length > 1 ? " fields" : " field"}.`,
        passed: invalidContactLabels.length === 0,
        failureSeverity: "warning",
        deduction: 10,
        suggestedFix: "Correct or remove malformed contact details so recruiters do not hit a dead end.",
      }),
      makeCheck({
        id: "experience-present",
        category: "essentials",
        title: "Experience is included",
        detail: data.experience.length > 0
          ? `Your résumé includes ${data.experience.length} experience ${data.experience.length === 1 ? "entry" : "entries"}.`
          : "Your résumé does not include any experience entries.",
        passed: data.experience.length > 0,
        failureSeverity: "critical",
        deduction: 25,
        suggestedFix: "Add at least one relevant job, internship, volunteer role, or substantial independent engagement.",
      }),
      makeCheck({
        id: "role-basics-complete",
        category: "essentials",
        title: "Every role has the basics",
        detail: incompleteRoles.length === 0
          ? "Every experience entry includes a title, organization, and dates."
          : `${incompleteRoles.length} experience ${incompleteRoles.length === 1 ? "entry is" : "entries are"} missing a title, organization, or dates.`,
        passed: incompleteRoles.length === 0,
        failureSeverity: "critical",
        deduction: 15,
        suggestedFix: "Complete the title, organization, and dates for every experience entry.",
      }),
      makeCheck({
        id: "experience-highlights-present",
        category: "essentials",
        title: "Every role explains your work",
        detail: rolesWithoutHighlights.length === 0
          ? "Every experience entry includes at least one accomplishment or responsibility."
          : `${rolesWithoutHighlights.length} experience ${rolesWithoutHighlights.length === 1 ? "entry has" : "entries have"} no highlights.`,
        passed: rolesWithoutHighlights.length === 0,
        failureSeverity: "critical",
        deduction: 10,
        suggestedFix: "Add at least one specific accomplishment or responsibility to every role.",
      }),
    ],
    content: [
      makeCheck({
        id: "summary-focused",
        category: "content",
        title: "The summary is focused",
        detail:
          summaryLength === 0
            ? "Your résumé does not include a professional summary."
            : summaryLength < 30
              ? "Your summary is too brief to establish your focus and value."
              : summaryLength > 650
                ? "Your summary is long enough to slow down a quick review."
                : "Your summary is present and a practical length for a quick review.",
        passed: summaryLength >= 30 && summaryLength <= 650,
        failureSeverity: "warning",
        deduction: 15,
        suggestedFix: "Use two or three concise sentences to name your focus, strongest skills, and the value you deliver.",
      }),
      makeCheck({
        id: "direct-bullet-language",
        category: "content",
        title: "Experience highlights use direct language",
        detail: directLanguageProblems.length === 0
          ? "Your highlights avoid first-person wording and passive phrases such as 'responsible for.'"
          : `Rewrite passive or first-person wording in ${listExamples(directLanguageProblems, "the flagged highlights")}.`,
        passed: directLanguageProblems.length === 0,
        failureSeverity: "warning",
        deduction: 15,
        suggestedFix: "Start with what you did, then describe the scope or result. For example: ‘Led ...’ or ‘Improved ...’. ",
      }),
      makeCheck({
        id: "strong-action-openings",
        category: "content",
        title: "Experience highlights open with strong actions",
        detail: weakActionOpenings.length === 0
          ? "Your experience highlights begin with clear action verbs."
          : `${weakActionOpenings.length} ${weakActionOpenings.length === 1 ? "highlight starts" : "highlights start"} without a clear action verb: ${listExamples(weakActionOpenings, "review the flagged highlights")}.`,
        passed: weakActionOpenings.length === 0,
        failureSeverity: "warning",
        deduction: 20,
        suggestedFix: "Open each highlight with a specific action such as led, built, improved, launched, analyzed, or delivered.",
      }),
      makeCheck({
        id: "bullet-length",
        category: "content",
        title: "Experience highlights are easy to scan",
        detail: lengthProblems.length === 0
          ? "Your experience highlights are a practical length for scanning."
          : `${lengthProblems.length} ${lengthProblems.length === 1 ? "highlight is" : "highlights are"} very short or longer than 45 words.`,
        passed: lengthProblems.length === 0,
        failureSeverity: "warning",
        deduction: 15,
        suggestedFix: "Aim for roughly 6 to 45 words per highlight, with one action and one result or useful detail.",
      }),
      makeCheck({
        id: "varied-opening-verbs",
        category: "content",
        title: "Opening verbs are varied",
        detail: repeatedOpenings.length === 0
          ? "No opening verb is repeated three or more times."
          : `Vary these opening verbs, which appear three or more times: ${repeatedOpenings.join(", ")}.`,
        passed: repeatedOpenings.length === 0,
        failureSeverity: "warning",
        deduction: 10,
        suggestedFix: "Replace repeated opening verbs with precise alternatives that describe the work you actually did.",
      }),
      makeCheck({
        id: "quantified-evidence",
        category: "content",
        title: "Experience includes measurable evidence",
        detail: hasQuantifiedEvidence
          ? "At least one experience highlight includes a number, percentage, amount, or scale."
          : "No experience highlight includes measurable scope or results.",
        passed: hasQuantifiedEvidence,
        failureSeverity: "warning",
        deduction: 15,
        suggestedFix: "Where accurate, add a number, percentage, dollar amount, team size, volume, timeframe, or other concrete scale.",
      }),
      makeCheck({
        id: "date-format-consistency",
        category: "content",
        title: "Experience dates are consistent",
        detail: datesAreConsistent
          ? "Experience dates use one recognizable level of detail."
          : "Experience dates mix year-only, month-and-year, or unrecognized formats.",
        passed: datesAreConsistent,
        failureSeverity: "warning",
        deduction: 10,
        suggestedFix: "Use the same date style for every role, such as ‘Jan 2022 - Present’ or ‘2022 - Present.’",
      }),
    ],
    searchability: [
      makeCheck({
        id: "headline-present",
        category: "searchability",
        title: "A professional headline is present",
        detail: data.headline
          ? "Your headline gives search systems and recruiters a clear professional signal."
          : "Your résumé does not include a professional headline.",
        passed: Boolean(data.headline),
        failureSeverity: "warning",
        deduction: 25,
        suggestedFix: "Add a concise headline using the role or professional specialty you want to be found for.",
      }),
      makeCheck({
        id: "skills-present",
        category: "searchability",
        title: "A useful skills section is present",
        detail: uniqueSkills.size >= 5
          ? `Your skills section includes ${uniqueSkills.size} distinct skills.`
          : `Your skills section includes ${uniqueSkills.size} distinct ${uniqueSkills.size === 1 ? "skill" : "skills"}; five or more is a more useful starting point.`,
        passed: uniqueSkills.size >= 5,
        failureSeverity: "warning",
        deduction: 30,
        suggestedFix: "Add at least five truthful, role-relevant tools, methods, or subject-matter skills.",
      }),
    ],
    pdf: [
      makeCheck({
        id: "pdf-renderable",
        category: "pdf",
        title: "The ATS PDF can be generated",
        detail: exportCheck.renderable
          ? "The PDF renderer produced a readable résumé file."
          : exportCheck.renderFailureReason ?? "The PDF renderer could not produce a readable résumé file.",
        passed: exportCheck.renderable === true,
        failureSeverity: "critical",
        deduction: 100,
        suggestedFix: "Review the résumé content for unsupported or unusually long text, save your changes, and try the PDF again.",
      }),
      {
        id: "pdf-page-count",
        category: "pdf",
        title: "PDF length is reported",
        detail:
          exportCheck.pageCount === null
            ? "The PDF page count is not available. This does not prevent the readiness check."
            : exportCheck.pageCount === 1
              ? "The generated PDF fits on one page."
              : `The generated PDF is ${exportCheck.pageCount} pages. Multiple pages do not make a résumé ATS-unreadable.`,
        severity: exportCheck.pageCount === 1 ? "pass" : "info",
        passed: true,
        pointsDeducted: 0,
      },
    ],
  };

  const normalizedTargetTitle = input.targetTitle?.trim() ?? "";
  const corpus = buildSearchCorpus(data);
  if (normalizedTargetTitle) {
    const targetTitleIsPresent = includesExactSearchTerm(corpus, normalizedTargetTitle);
    checks.searchability.push(
      makeCheck({
        id: "target-title-present",
        category: "searchability",
        title: "The target title appears in the résumé",
        detail: targetTitleIsPresent
          ? `"${normalizedTargetTitle}" appears in the résumé.`
          : `"${normalizedTargetTitle}" does not appear as an exact phrase in the résumé.`,
        passed: targetTitleIsPresent,
        failureSeverity: "warning",
        deduction: 20,
        suggestedFix: "If it is accurate, use the target title in your headline, summary, or experience title without keyword stuffing.",
      }),
    );
  }

  const jobDescription = input.jobDescription?.trim() ?? "";
  const keywordCoverage = jobDescription ? buildKeywordCoverage(data, jobDescription) : undefined;
  if (keywordCoverage) {
    const keywordCoverageIsUseful =
      keywordCoverage.keywords.length === 0 || keywordCoverage.coveragePercent >= 70;
    checks.searchability.push(
      makeCheck({
        id: "job-keyword-coverage",
        category: "searchability",
        title: "Relevant job-description terms are represented",
        detail:
          keywordCoverage.keywords.length === 0
            ? "The job description did not contain enough specific terms to compare."
            : `${keywordCoverage.coveragePercent}% of the selected job-description terms appear in the résumé.`,
        passed: keywordCoverageIsUseful,
        failureSeverity: "warning",
        deduction: 25,
        suggestedFix:
          keywordCoverage.missingKeywords.length > 0
            ? `Add only the missing terms that truthfully describe you: ${keywordCoverage.missingKeywords.join(", ")}.`
            : "Keep the role-relevant terms that accurately describe your experience.",
      }),
    );
  }

  const categoryScores = Object.fromEntries(
    (Object.keys(checks) as AtsReadinessCategory[]).map((category) => [
      category,
      clampScore(
        100 - checks[category].reduce((total, check) => total + check.pointsDeducted, 0),
      ),
    ]),
  ) as Record<AtsReadinessCategory, number>;
  const allChecks = (Object.keys(checks) as AtsReadinessCategory[]).flatMap(
    (category) => checks[category],
  );
  const criticalFixes = allChecks.filter((check) => check.severity === "critical");
  const improvements = allChecks.filter((check) => check.severity === "warning");
  const passedChecks = allChecks.filter((check) => check.passed);
  const score = clampScore(
    (Object.keys(categoryScores) as AtsReadinessCategory[]).reduce(
      (total, category) => total + categoryScores[category] * CATEGORY_WEIGHTS[category],
      0,
    ),
  );
  const status: AtsReadinessStatus =
    criticalFixes.length > 0
      ? "not_ready"
      : improvements.length > 0
        ? "needs_attention"
        : "ready";

  return {
    status,
    score,
    categoryScores,
    checks,
    criticalFixes,
    improvements,
    passedChecks,
    pdf: {
      renderable: exportCheck.renderable === true,
      pageCount: exportCheck.pageCount,
      fitsOnOnePage: exportCheck.fitsOnOnePage,
      renderFailureReason: exportCheck.renderFailureReason ?? null,
      overflowReasons: [...exportCheck.overflowReasons],
      recommendedFixes: [...exportCheck.recommendedFixes],
    },
    ...(keywordCoverage ? { keywordCoverage } : {}),
    fingerprint: buildAtsReadinessFingerprint(data),
    evaluatedAt: input.evaluatedAt ?? null,
    disclaimer: ATS_READINESS_DISCLAIMER,
  };
}
