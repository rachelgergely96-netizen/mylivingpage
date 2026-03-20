import type { ResumeData } from "@/types/resume";

type UnknownRecord = Record<string, unknown>;

const PDF_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u2032]/g, "'"],
  [/[\u201C\u201D\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/[\u2022\u2023\u25E6\u2043\u00B7]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00A0/g, " "],
  [/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2/g, "-"],
  [/\u00c3\u201a\u00c2\u00b7/g, "-"],
  [/Ã¢â‚¬Â¢/g, "-"],
  [/Ã‚Â·/g, "-"],
  [/Ã¢â‚¬â€|Ã¢â‚¬â€œ|Ã¢â‚¬"/g, "-"],
];

const CP1252_REVERSE_BYTES: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasContent(...values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(value && value.trim().length > 0));
}

function repairCommonMojibake(value: string) {
  if (!/[ÃÂâ]/.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    const mappedByte = CP1252_REVERSE_BYTES[char];
    if (mappedByte === undefined) {
      return value;
    }

    bytes.push(mappedByte);
  }

  try {
    return new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
  } catch {
    return value;
  }
}

function normalizeAscii(value: string) {
  const repaired = repairCommonMojibake(value);

  return PDF_TEXT_REPLACEMENTS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    repaired,
  )
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripProtocol(value: string) {
  return value.replace(/^https?:\/\/(www\.)?/i, "");
}

function normalizeContact(value: unknown, kind: "linkedin" | "github" | "website") {
  const clean = toText(value);
  if (!clean) {
    return null;
  }

  if (kind === "linkedin") {
    if (/linkedin\.com/i.test(clean)) {
      return stripProtocol(clean);
    }
    const handle = clean.replace(/^@/, "");
    return handle ? `linkedin.com/in/${handle}` : null;
  }

  if (kind === "github") {
    if (/github\.com/i.test(clean)) {
      return stripProtocol(clean);
    }
    const handle = clean.replace(/^@/, "");
    return handle ? `github.com/${handle}` : null;
  }

  return stripProtocol(clean);
}

function toText(value: unknown): string {
  if (typeof value === "string") {
    return normalizeAscii(value);
  }

  if (typeof value === "number") {
    return normalizeAscii(String(value));
  }

  if (Array.isArray(value)) {
    return normalizeAscii(
      value
        .map((item) => toText(item))
        .filter(Boolean)
        .join(" "),
    );
  }

  return "";
}

function toOptionalText(value: unknown): string | null {
  const text = toText(value);
  return text || null;
}

function toUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const text = toText(value);
  return text ? [text] : [];
}

function toStringArray(value: unknown): string[] {
  return toUnknownArray(value)
    .map((item) => toText(item))
    .filter(Boolean);
}

export function normalizeResumeText(value: string): string {
  return normalizeAscii(value);
}

export function buildResumePdfFileName(name: string | null | undefined): string {
  const normalized = normalizeAscii(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized ? `${normalized}-resume.pdf` : "resume.pdf";
}

export function coerceResumeDataForExport(value: unknown): ResumeData {
  const record = isRecord(value) ? value : null;

  const experience = toUnknownArray(record?.experience)
    .map((entry) => {
      const safeEntry = isRecord(entry) ? entry : null;
      if (!safeEntry) {
        return null;
      }

      const title = toText(safeEntry.title);
      const company = toText(safeEntry.company);
      const dates = toText(safeEntry.dates);
      const highlights = toStringArray(safeEntry.highlights);
      const url = toOptionalText(safeEntry.url);

      if (!hasContent(title, company, dates, url) && highlights.length === 0) {
        return null;
      }

      return {
        title,
        company,
        dates,
        highlights,
        url,
      };
    })
    .filter((entry): entry is ResumeData["experience"][number] => entry !== null);

  const education = toUnknownArray(record?.education)
    .map((entry) => {
      const safeEntry = isRecord(entry) ? entry : null;
      if (!safeEntry) {
        return null;
      }

      const degree = toText(safeEntry.degree);
      const school = toText(safeEntry.school);
      const year = toText(safeEntry.year);

      if (!hasContent(degree, school, year)) {
        return null;
      }

      return {
        degree,
        school,
        year,
      };
    })
    .filter((entry): entry is ResumeData["education"][number] => entry !== null);

  const projects = toUnknownArray(record?.projects)
    .map((project) => {
      const safeProject = isRecord(project) ? project : null;
      if (!safeProject) {
        return null;
      }

      const name = toText(safeProject.name);
      const description = toText(safeProject.description);
      const tech = toStringArray(safeProject.tech);
      const url = toOptionalText(safeProject.url);

      if (!hasContent(name, description, url) && tech.length === 0) {
        return null;
      }

      return {
        name,
        description,
        tech,
        url,
      };
    })
    .filter((project): project is ResumeData["projects"][number] => project !== null);

  const skills = toUnknownArray(record?.skills)
    .map((group) => {
      const safeGroup = isRecord(group) ? group : null;
      if (!safeGroup) {
        return null;
      }

      const items = toStringArray(safeGroup.items);
      const category = toText(safeGroup.category) || (items.length ? "Skills" : "");

      if (!hasContent(category) && items.length === 0) {
        return null;
      }

      return {
        category,
        items,
      };
    })
    .filter((group): group is ResumeData["skills"][number] => group !== null);

  const certifications = toUnknownArray(record?.certifications)
    .map((certification) => {
      const safeCertification = isRecord(certification) ? certification : null;
      if (!safeCertification) {
        return null;
      }

      const name = toText(safeCertification.name);
      const issuer = toOptionalText(safeCertification.issuer);
      const date = toOptionalText(safeCertification.date);

      if (!hasContent(name, issuer, date)) {
        return null;
      }

      return {
        name,
        issuer,
        date,
      };
    })
    .filter(
      (certification): certification is ResumeData["certifications"][number] =>
        certification !== null,
    );

  const stats = toUnknownArray(record?.stats)
    .map((stat) => {
      const safeStat = isRecord(stat) ? stat : null;
      if (!safeStat) {
        return null;
      }

      const value = toText(safeStat.value);
      const label = toText(safeStat.label);

      if (!hasContent(value, label)) {
        return null;
      }

      return {
        value,
        label,
      };
    })
    .filter((stat): stat is ResumeData["stats"][number] => stat !== null);

  return {
    name: toText(record?.name) || "Resume",
    headline: toText(record?.headline),
    location: toText(record?.location),
    email: toOptionalText(record?.email),
    linkedin: normalizeContact(record?.linkedin, "linkedin"),
    github: normalizeContact(record?.github, "github"),
    website: normalizeContact(record?.website, "website"),
    avatar_url: toOptionalText(record?.avatar_url),
    summary: record ? toText(record.summary) : toText(value),
    experience,
    education,
    projects,
    skills,
    certifications,
    stats,
  };
}

export function normalizeResumeDataForExport(data: unknown): ResumeData {
  return coerceResumeDataForExport(data);
}
