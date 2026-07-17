import type { ResumeData } from "@/types/resume";

export const MAX_RESUME_TEXT_CHARACTERS = 100_000;

export type ResumeImportField =
  | "name"
  | "headline"
  | "location"
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

export interface ParsedResumeImport {
  data: ResumeData;
  detectedFields: ResumeImportField[];
  warnings: string[];
}

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

const SECTION_PATTERNS: Array<[SectionKey, RegExp]> = [
  ["summary", /^(?:professional\s+)?(?:summary|profile|overview|objective|about(?:\s+me)?)$/i],
  ["experience", /^(?:professional\s+|work\s+|employment\s+)?(?:experience|history|background)$/i],
  ["education", /^(?:education|academic\s+(?:background|history)|qualifications)$/i],
  ["skills", /^(?:skills|technical\s+skills|core\s+competencies|competencies|expertise|technologies|tools)$/i],
  ["projects", /^(?:projects|selected\s+projects|personal\s+projects|portfolio)$/i],
  ["certifications", /^(?:certifications?|licenses?(?:\s+and\s+certifications?)?|credentials|professional\s+development)$/i],
];

const JOB_TITLE_RE =
  /\b(?:engineer|developer|architect|manager|director|lead|specialist|analyst|consultant|designer|strategist|coordinator|administrator|executive|officer|president|founder|owner|intern|associate|scientist|researcher|producer|editor|writer|recruiter|accountant|attorney|teacher|professor|nurse|physician|technician|representative|supervisor|head|chief|vp|vice president|product|marketing|sales|operations|customer success|program|project)\b/i;
const DEGREE_RE =
  /\b(?:associate|bachelor|master|doctor|ph\.?d|mba|mfa|b\.?[as]\.?|m\.?[as]\.?|degree|diploma|certificate|major|minor)\b/i;
const COMPANY_RE =
  /\b(?:inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|group|partners|agency|studio|systems|solutions|technologies|university|college|hospital|foundation|association)\b/i;
const MONTH_RE =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_POINT_RE = `(?:${MONTH_RE}\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE_RE = new RegExp(
  `\\b(?:${DATE_POINT_RE}\\s*(?:-|–|—|to)\\s*(?:present|current|now|${DATE_POINT_RE})|${MONTH_RE}\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:present|current|now|(?:19|20)\\d{2}))\\b`,
  "i",
);
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s|•]+|(?:linkedin\.com\/in|github\.com\/)[^\s|•]+/gi;

function emptyResumeData(): ResumeData {
  return {
    name: "",
    headline: "",
    location: "",
    email: null,
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    stats: [],
    proofs: [],
    testimonials: [],
  };
}

function normalizeLines(text: string) {
  return text
    .slice(0, MAX_RESUME_TEXT_CHARACTERS)
    .replace(/\u0000/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\t+/g, " | ")
        .replace(/[ \u2000-\u200b]+/g, " ")
        .trim(),
    );
}

function sectionHeading(line: string): SectionKey | null {
  const normalized = line
    .replace(/^[#>*\s]+/, "")
    .replace(/[\s:|\-–—]+$/, "")
    .trim();

  if (!normalized || normalized.length > 44) {
    return null;
  }

  return SECTION_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

function splitIntoSections(lines: string[]) {
  const preamble: string[] = [];
  const sections: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
  let activeSection: SectionKey | null = null;

  for (const line of lines) {
    const heading = sectionHeading(line);
    if (heading) {
      activeSection = heading;
      continue;
    }

    if (!line) {
      continue;
    }

    if (activeSection) {
      sections[activeSection].push(line);
    } else {
      preamble.push(line);
    }
  }

  return { preamble, sections };
}

function cleanBullet(line: string) {
  return line.replace(/^(?:[•●▪◦*+]|-{1,2}|\d+[.)])\s*/, "").trim();
}

function isBullet(line: string) {
  return /^(?:[•●▪◦*+]|-{1,2}|\d+[.)])\s+/.test(line);
}

function cleanUrl(value: string) {
  return value.replace(/[),.;]+$/, "");
}

function ensureProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^www\./i, "")}`;
}

function looksLikeContact(line: string) {
  return (
    EMAIL_RE.test(line) ||
    /(?:https?:\/\/|www\.|linkedin\.com|github\.com)/i.test(line) ||
    /(?:\+?\d[\d().\s-]{7,}\d)/.test(line)
  );
}

function looksLikeName(line: string) {
  if (
    line.length < 3 ||
    line.length > 70 ||
    looksLikeContact(line) ||
    /\d/.test(line) ||
    JOB_TITLE_RE.test(line) ||
    /[!?;:]$/.test(line) ||
    /\b(?:resume|curriculum|vitae|profile|summary|portfolio)\b/i.test(line)
  ) {
    return false;
  }

  const words = line.split(/\s+/);
  const connectorWords = new Set(["da", "de", "del", "der", "di", "la", "le", "van", "von"]);
  const usesNameCapitalization = words.every((word) => {
    const normalized = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    return (
      !normalized ||
      connectorWords.has(normalized.toLowerCase()) ||
      normalized === normalized.toUpperCase() ||
      /^\p{Lu}/u.test(normalized)
    );
  });
  return (
    words.length >= 2 &&
    words.length <= 6 &&
    usesNameCapitalization &&
    /^[\p{L} .,'’-]+$/u.test(line)
  );
}

function looksLikeLocation(value: string) {
  const line = value.trim();
  return (
    line.length <= 70 &&
    !looksLikeContact(line) &&
    !JOB_TITLE_RE.test(line) &&
    (/(?:^|\b)(?:remote|hybrid)(?:\b|$)/i.test(line) ||
      /^[\p{L} .'-]+,\s*(?:[A-Z]{2}|[\p{L} .'-]+)$/u.test(line))
  );
}

function findContactDetails(text: string, preamble: string[]) {
  const preambleText = preamble.join("\n");
  const preambleUrls = Array.from(
    preambleText.matchAll(URL_RE),
    (match) => cleanUrl(match[0] ?? ""),
  )
    .filter(Boolean)
    .slice(0, 20);
  const allUrls = Array.from(text.matchAll(URL_RE), (match) => cleanUrl(match[0] ?? ""))
    .filter(Boolean)
    .slice(0, 40);
  const linkedinValue =
    preambleUrls.find((url) => /linkedin\.com\/in/i.test(url)) ??
    allUrls.find((url) => /linkedin\.com\/in/i.test(url)) ??
    null;
  const githubValue =
    preambleUrls.find((url) => /github\.com\//i.test(url)) ??
    allUrls.find((url) => /github\.com\//i.test(url)) ??
    null;
  const websiteValue =
    preambleUrls.find((url) => !/linkedin\.com|github\.com/i.test(url)) ?? null;
  const contactSegments = preamble.flatMap((line) => line.split(/\s*[|•]\s*/));
  const location = contactSegments.find(looksLikeLocation) ?? "";

  return {
    email: preambleText.match(EMAIL_RE)?.[0] ?? text.match(EMAIL_RE)?.[0] ?? null,
    linkedin: linkedinValue ? ensureProtocol(linkedinValue) : null,
    github: githubValue ? ensureProtocol(githubValue) : null,
    website: websiteValue ? ensureProtocol(websiteValue) : null,
    location,
  };
}

function findDateRange(line: string) {
  const match = line.match(DATE_RANGE_RE);
  if (!match?.[0]) {
    return null;
  }

  const cleaned = match[0].replace(/\s+/g, " ").trim();
  const remainder = line.replace(match[0], "").replace(/^[\s|,;·•–—-]+|[\s|,;·•–—-]+$/g, "");
  if (!remainder && cleaned.length === 4 && line.length > 12) {
    return null;
  }

  return { dates: cleaned, remainder };
}

function findEducationDate(line: string) {
  const range = findDateRange(line);
  if (range) {
    return range;
  }
  const yearMatch = line.match(/\b(?:19|20)\d{2}\b/);
  if (!yearMatch?.[0]) {
    return null;
  }
  return {
    dates: yearMatch[0],
    remainder: line
      .replace(yearMatch[0], "")
      .replace(/^[\s|,;·•–—-]+|[\s|,;·•–—-]+$/g, ""),
  };
}

function headerCandidatesBefore(lines: string[], dateIndex: number) {
  const candidates: Array<{ index: number; value: string }> = [];
  for (let index = dateIndex - 1; index >= 0 && candidates.length < 2; index -= 1) {
    const value = cleanBullet(lines[index] ?? "");
    if (!value || isBullet(lines[index] ?? "") || findDateRange(value)) {
      break;
    }
    if (value.length > 120 || /[.!?]$/.test(value)) {
      break;
    }
    candidates.unshift({ index, value });
  }
  return candidates;
}

function splitHeaderParts(values: string[]) {
  return values
    .flatMap((value) => value.split(/\s*(?:\||•|·|@)\s*|\s+at\s+/i))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function assignTitleAndCompany(parts: string[]) {
  if (parts.length < 2) {
    return { title: "", company: "" };
  }

  const titleIndex = parts.findIndex((part) => JOB_TITLE_RE.test(part));
  if (titleIndex >= 0) {
    const companyIndex = parts.findIndex((_, index) => index !== titleIndex);
    return {
      title: parts[titleIndex] ?? "",
      company: parts[companyIndex] ?? "",
    };
  }

  const companyIndex = parts.findIndex((part) => COMPANY_RE.test(part));
  if (companyIndex >= 0) {
    const titleIndexFallback = parts.findIndex((_, index) => index !== companyIndex);
    return {
      title: parts[titleIndexFallback] ?? "",
      company: parts[companyIndex] ?? "",
    };
  }

  return { title: parts[0] ?? "", company: parts[1] ?? "" };
}

function parseExperience(lines: string[]): ResumeData["experience"] {
  const markers = lines.flatMap((line, index) => {
    const date = findDateRange(line);
    if (!date) {
      return [];
    }

    const before = date.remainder ? [] : headerCandidatesBefore(lines, index);
    return [
      {
        index,
        headerStart: before[0]?.index ?? index,
        dates: date.dates,
        headerValues: date.remainder
          ? [date.remainder]
          : before.map((candidate) => candidate.value),
      },
    ];
  });

  return markers
    .map((marker, markerIndex) => {
      const nextHeaderStart = markers[markerIndex + 1]?.headerStart ?? lines.length;
      const parts = splitHeaderParts(marker.headerValues);
      const { title, company } = assignTitleAndCompany(parts);
      const highlights: string[] = [];

      for (let index = marker.index + 1; index < nextHeaderStart; index += 1) {
        const sourceLine = lines[index] ?? "";
        const value = cleanBullet(sourceLine);
        if (!value || sectionHeading(value) || findDateRange(value)) {
          continue;
        }

        if (!isBullet(sourceLine) && highlights.length > 0 && value.length < 90) {
          highlights[highlights.length - 1] = `${highlights[highlights.length - 1]} ${value}`.trim();
        } else {
          highlights.push(value);
        }
      }

      return {
        title: title.slice(0, 160),
        company: company.slice(0, 160),
        dates: marker.dates.slice(0, 100),
        highlights: highlights.slice(0, 12),
        url: null,
      };
    })
    .filter((entry) => entry.title && entry.company)
    .slice(0, 20);
}

function assignDegreeAndSchool(parts: string[]) {
  if (parts.length < 2) {
    return { degree: parts[0] ?? "", school: "" };
  }
  const degreeIndex = parts.findIndex((part) => DEGREE_RE.test(part));
  if (degreeIndex >= 0) {
    const schoolIndex = parts.findIndex((_, index) => index !== degreeIndex);
    return { degree: parts[degreeIndex] ?? "", school: parts[schoolIndex] ?? "" };
  }
  return { degree: parts[0] ?? "", school: parts[1] ?? "" };
}

function parseEducation(lines: string[]): ResumeData["education"] {
  const datedEntries = lines.flatMap((line, index) => {
    const date = findEducationDate(line);
    if (!date) {
      return [];
    }
    const before = date.remainder ? [] : headerCandidatesBefore(lines, index);
    const parts = splitHeaderParts(
      date.remainder ? [date.remainder] : before.map((candidate) => candidate.value),
    );
    const { degree, school } = assignDegreeAndSchool(parts);
    return degree && school
      ? [{ degree, school, year: date.dates }]
      : [];
  });

  if (datedEntries.length > 0) {
    return datedEntries.slice(0, 12);
  }

  const values = lines.map(cleanBullet).filter(Boolean);
  const entries: ResumeData["education"] = [];
  for (let index = 0; index < values.length - 1; index += 2) {
    const { degree, school } = assignDegreeAndSchool(values.slice(index, index + 2));
    if (degree && school) {
      entries.push({ degree, school, year: "" });
    }
  }
  return entries.slice(0, 12);
}

function parseSkills(lines: string[]): ResumeData["skills"] {
  const groups = new Map<string, string[]>();

  for (const sourceLine of lines) {
    const line = cleanBullet(sourceLine);
    if (!line) {
      continue;
    }

    const colonIndex = line.indexOf(":");
    const category = colonIndex > 0 && colonIndex < 40 ? line.slice(0, colonIndex).trim() : "General";
    const itemText = colonIndex > 0 && colonIndex < 40 ? line.slice(colonIndex + 1) : line;
    const items = itemText
      .split(/\s*(?:,|;|\||•|·)\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 80);

    if (items.length === 0) {
      continue;
    }
    const current = groups.get(category) ?? [];
    groups.set(category, Array.from(new Set([...current, ...items])).slice(0, 40));
  }

  return Array.from(groups, ([category, items]) => ({ category, items })).slice(0, 12);
}

function parseProjects(lines: string[]): ResumeData["projects"] {
  const projects: ResumeData["projects"] = [];
  let current: ResumeData["projects"][number] | null = null;

  for (const sourceLine of lines) {
    const line = cleanBullet(sourceLine);
    if (!line) {
      continue;
    }
    const url = line.match(URL_RE)?.[0] ?? null;

    if (!isBullet(sourceLine) && line.length <= 100) {
      if (current?.name) {
        projects.push(current);
      }
      current = {
        name: url ? line.replace(url, "").replace(/[|·•–—-]+$/g, "").trim() : line,
        description: "",
        tech: [],
        url: url ? ensureProtocol(cleanUrl(url)) : null,
      };
      continue;
    }

    if (current) {
      current.description = `${current.description} ${line}`.trim().slice(0, 1_500);
      if (!current.url && url) {
        current.url = ensureProtocol(cleanUrl(url));
      }
    }
  }

  if (current?.name) {
    projects.push(current);
  }
  return projects.slice(0, 12);
}

function parseCertifications(lines: string[]): ResumeData["certifications"] {
  return lines
    .map(cleanBullet)
    .filter(Boolean)
    .map((line) => {
      const date = findEducationDate(line);
      const withoutDate = date ? line.replace(date.dates, "").trim() : line;
      const parts = withoutDate
        .split(/\s*(?:\||•|·|—|–)\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      return {
        name: parts[0] ?? "",
        issuer: parts[1] ?? null,
        date: date?.dates ?? null,
      };
    })
    .filter((entry) => entry.name)
    .slice(0, 20);
}

function getDetectedFields(data: ResumeData): ResumeImportField[] {
  const fields: ResumeImportField[] = [];
  if (data.name) fields.push("name");
  if (data.headline) fields.push("headline");
  if (data.location) fields.push("location");
  if (data.email || data.linkedin || data.github || data.website) fields.push("contact");
  if (data.summary) fields.push("summary");
  if (data.experience.length) fields.push("experience");
  if (data.education.length) fields.push("education");
  if (data.skills.length) fields.push("skills");
  if (data.projects.length) fields.push("projects");
  if (data.certifications.length) fields.push("certifications");
  return fields;
}

export function parseResumeText(text: string): ParsedResumeImport {
  const normalizedText = text.slice(0, MAX_RESUME_TEXT_CHARACTERS);
  const lines = normalizeLines(normalizedText);
  const { preamble, sections } = splitIntoSections(lines);
  const data = emptyResumeData();
  const contact = findContactDetails(normalizedText, preamble);
  const nameIndex = preamble.findIndex(looksLikeName);

  data.name = nameIndex >= 0 ? preamble[nameIndex] ?? "" : "";
  data.location = contact.location;
  data.email = contact.email;
  data.linkedin = contact.linkedin;
  data.github = contact.github;
  data.website = contact.website;
  data.experience = parseExperience(sections.experience);
  data.education = parseEducation(sections.education);
  data.skills = parseSkills(sections.skills);
  data.projects = parseProjects(sections.projects);
  data.certifications = parseCertifications(sections.certifications);
  data.summary = sections.summary.map(cleanBullet).filter(Boolean).join(" ").slice(0, 2_000);

  const headlineCandidates = preamble
    .slice(Math.max(0, nameIndex + 1), Math.max(0, nameIndex + 7))
    .flatMap((line) => line.split(/\s*[|•]\s*/))
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        line.length <= 140 &&
        !looksLikeContact(line) &&
        !looksLikeLocation(line) &&
        !sectionHeading(line),
    );
  data.headline =
    headlineCandidates.find((line) => JOB_TITLE_RE.test(line)) ??
    headlineCandidates[0] ??
    data.experience[0]?.title ??
    "";

  const detectedFields = getDetectedFields(data);
  const warnings: string[] = [];
  if (!data.name) {
    warnings.push("We could not confidently identify your name. Add it in the first step.");
  }
  if (!data.headline) {
    warnings.push("We could not confidently identify a professional headline.");
  }
  if (detectedFields.length <= 2) {
    warnings.push("Only a few fields were detected. Review the imported text and fill any gaps.");
  }

  return { data, detectedFields, warnings };
}
