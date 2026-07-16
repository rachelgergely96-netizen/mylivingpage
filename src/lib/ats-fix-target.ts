import {
  getAtsDateStyle,
  getAtsHighlightOpening,
  hasRecognizedAtsActionOpening,
  type AtsReadinessCheck,
  type AtsFixSection,
} from "@/lib/ats-readiness";
import type { ResumeData } from "@/types/resume";

export type AtsFixField =
  | "name"
  | "headline"
  | "email"
  | "linkedin"
  | "github"
  | "website"
  | "experience-add"
  | "experience-title"
  | "experience-company"
  | "experience-dates"
  | "experience-highlights"
  | "skills-add"
  | "skills-items"
  | "summary";

export interface AtsFixTarget {
  section: AtsFixSection;
  field: AtsFixField;
  entryIndex?: number;
  actionLabel: string;
}

const EXPERIENCE_HIGHLIGHT_CHECKS = new Set([
  "direct-bullet-language",
  "strong-action-openings",
  "bullet-length",
  "varied-opening-verbs",
  "quantified-evidence",
]);

function looksLikeEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value));
}

function looksLikeLink(value: string | null) {
  if (!value || /\s/.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function contactTarget(data: ResumeData): AtsFixTarget {
  if (data.email && !looksLikeEmail(data.email)) {
    return { section: "profile", field: "email", actionLabel: "Fix my email" };
  }

  for (const field of ["linkedin", "github", "website"] as const) {
    if (data[field] && !looksLikeLink(data[field])) {
      return { section: "links", field, actionLabel: `Fix my ${field === "github" ? "GitHub" : field}` };
    }
  }

  return { section: "profile", field: "email", actionLabel: "Add contact details" };
}

function meaningfulExperienceEntries(data: ResumeData) {
  return data.experience
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter(({ entry }) =>
      Boolean(
        entry.title.trim() ||
          entry.company.trim() ||
          entry.dates.trim() ||
          entry.url?.trim() ||
          entry.highlights.some((highlight) => highlight.trim()),
      ),
    );
}

function roleBasicsTarget(data: ResumeData): AtsFixTarget {
  const incompleteRole = meaningfulExperienceEntries(data).find(
    ({ entry }) => !entry.title.trim() || !entry.company.trim() || !entry.dates.trim(),
  );
  const index = incompleteRole?.entryIndex ?? 0;
  const entry = data.experience[index];
  const field: AtsFixField = !entry?.title.trim()
    ? "experience-title"
    : !entry.company.trim()
      ? "experience-company"
      : "experience-dates";

  return {
    section: "experience",
    field,
    entryIndex: index,
    actionLabel: "Complete role details",
  };
}

function highlightTarget(data: ResumeData, checkId: string): AtsFixTarget {
  const meaningfulEntries = meaningfulExperienceEntries(data);
  let entryIndex = meaningfulEntries[0]?.entryIndex ?? 0;

  if (checkId === "experience-highlights-present") {
    const emptyRole = meaningfulEntries.find(
      ({ entry }) => !entry.highlights.some((highlight) => highlight.trim()),
    );
    entryIndex = emptyRole?.entryIndex ?? entryIndex;
  } else if (checkId === "direct-bullet-language") {
    const indirectIndex = data.experience.findIndex((entry) =>
      entry.highlights.some((highlight) =>
        /\b(?:i|me|my|mine|we|our|ours|responsible for|duties included|tasked with|worked on|helped with)\b/i.test(
          highlight,
        ),
      ),
    );
    entryIndex = indirectIndex >= 0 ? indirectIndex : entryIndex;
  } else if (checkId === "bullet-length") {
    const lengthIndex = data.experience.findIndex((entry) =>
      entry.highlights.some((highlight) => {
        const count = highlight.trim() ? highlight.trim().split(/\s+/).length : 0;
        return count > 0 && (count < 6 || count > 45);
      }),
    );
    entryIndex = lengthIndex >= 0 ? lengthIndex : entryIndex;
  } else if (checkId === "strong-action-openings") {
    const openingIndex = data.experience.findIndex((entry) =>
      entry.highlights.some(
        (highlight) => highlight.trim() && !hasRecognizedAtsActionOpening(highlight),
      ),
    );
    entryIndex = openingIndex >= 0 ? openingIndex : entryIndex;
  } else if (checkId === "varied-opening-verbs") {
    const openingCounts = new Map<string, number>();
    data.experience.forEach((entry) => {
      entry.highlights.forEach((highlight) => {
        const opening = getAtsHighlightOpening(highlight.trim());
        if (opening) {
          openingCounts.set(opening, (openingCounts.get(opening) ?? 0) + 1);
        }
      });
    });
    const repeatedOpenings = new Set(
      [...openingCounts.entries()]
        .filter(([, count]) => count >= 3)
        .map(([opening]) => opening),
    );
    const repeatedIndex = data.experience.findIndex((entry) =>
      entry.highlights.some((highlight) =>
        repeatedOpenings.has(getAtsHighlightOpening(highlight.trim())),
      ),
    );
    entryIndex = repeatedIndex >= 0 ? repeatedIndex : entryIndex;
  }

  return {
    section: "experience",
    field: "experience-highlights",
    entryIndex,
    actionLabel: checkId === "experience-highlights-present"
      ? "Add role highlights"
      : "Improve experience highlights",
  };
}

function dateConsistencyTarget(data: ResumeData): AtsFixTarget {
  const entries = meaningfulExperienceEntries(data);
  const styles = entries.map(({ entry, entryIndex }) => ({
    entryIndex,
    style: getAtsDateStyle(entry.dates.trim()),
  }));
  const unrecognized = styles.find(({ style }) => style === "unknown");
  let entryIndex = unrecognized?.entryIndex;

  if (entryIndex === undefined && styles.length > 1) {
    const counts = new Map<string, number>();
    styles.forEach(({ style }) => counts.set(style, (counts.get(style) ?? 0) + 1));
    const dominantStyle = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
    entryIndex = styles.find(({ style }) => style !== dominantStyle)?.entryIndex;
  }

  return {
    section: "experience",
    field: "experience-dates",
    entryIndex: entryIndex ?? entries[0]?.entryIndex ?? 0,
    actionLabel: "Review role dates",
  };
}

export function resolveAtsFixTarget(
  check: AtsReadinessCheck,
  data: ResumeData,
): AtsFixTarget | null {
  switch (check.id) {
    case "name-present":
      return { section: "profile", field: "name", actionLabel: check.actionLabel ?? "Add my name" };
    case "headline-present":
    case "target-title-present":
      return { section: "profile", field: "headline", actionLabel: check.actionLabel ?? "Edit my headline" };
    case "usable-contact":
    case "contact-values-valid":
      return contactTarget(data);
    case "experience-present":
      return {
        section: "experience",
        field: data.experience.length === 0 ? "experience-add" : "experience-title",
        entryIndex: data.experience.length === 0 ? undefined : 0,
        actionLabel: check.actionLabel ?? "Add experience",
      };
    case "role-basics-complete":
      return roleBasicsTarget(data);
    case "experience-highlights-present":
      return highlightTarget(data, check.id);
    case "date-format-consistency":
      return {
        ...dateConsistencyTarget(data),
        actionLabel: check.actionLabel ?? "Review role dates",
      };
    case "summary-focused":
      return { section: "summary", field: "summary", actionLabel: check.actionLabel ?? "Edit my summary" };
    case "skills-present":
      return {
        section: "skills",
        field: data.skills.length === 0 ? "skills-add" : "skills-items",
        entryIndex: data.skills.length === 0 ? undefined : 0,
        actionLabel: check.actionLabel ?? "Edit my skills",
      };
    default:
      if (EXPERIENCE_HIGHLIGHT_CHECKS.has(check.id)) {
        return highlightTarget(data, check.id);
      }
      return null;
  }
}

export function getAtsFixFieldKey(target: AtsFixTarget) {
  return target.entryIndex === undefined
    ? target.field
    : `${target.field}-${target.entryIndex}`;
}

export function getGuidedStepForAtsFix(section: AtsFixSection) {
  switch (section) {
    case "profile":
      return 0;
    case "links":
      return 1;
    case "experience":
      return 2;
    case "skills":
      return 4;
    case "summary":
      return 5;
  }
}
