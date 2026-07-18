const encoder = new TextEncoder();

export const MAX_PAGE_WRITE_BODY_BYTES = 512 * 1024;
export const MAX_RESUME_DATA_BYTES = 256 * 1024;
export const MAX_PAGE_CONFIG_BYTES = 256 * 1024;
export const MAX_PAGE_TITLE_LENGTH = 160;
export const MAX_RAW_RESUME_CHARACTERS = 100_000;

const RESUME_ROOT_KEYS = new Set([
  "name",
  "headline",
  "location",
  "email",
  "linkedin",
  "github",
  "website",
  "avatar_url",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "stats",
  "proofs",
  "testimonials",
]);

const PAGE_CONFIG_KEYS = new Set([
  "ats",
  "variants",
  "decision_readiness",
  "job_search_profile",
]);

type JsonRecord = Record<string, unknown>;

export function isPlainJsonObject(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getSerializedByteLength(value: unknown) {
  try {
    return encoder.encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function validateJsonComplexity(
  value: unknown,
  state = { nodes: 0 },
  depth = 0,
): string | null {
  state.nodes += 1;
  if (state.nodes > 5_000) {
    return "contains too many values";
  }
  if (depth > 12) {
    return "is nested too deeply";
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return null;
  }
  if (typeof value === "string") {
    if (value.length > 20_000) {
      return "contains a text value that is too long";
    }
    if (value.includes("\u0000")) {
      return "contains an unsupported null character";
    }
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length > 250) {
      return "contains an array with too many items";
    }
    for (const item of value) {
      const error = validateJsonComplexity(item, state, depth + 1);
      if (error) return error;
    }
    return null;
  }
  if (!isPlainJsonObject(value)) {
    return "contains a non-JSON value";
  }

  const entries = Object.entries(value);
  if (entries.length > 100) {
    return "contains an object with too many fields";
  }
  for (const [key, child] of entries) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      return "contains an unsafe field name";
    }
    const error = validateJsonComplexity(child, state, depth + 1);
    if (error) return error;
  }
  return null;
}

function isStringOrNull(value: unknown) {
  return typeof value === "string" || value === null;
}

function validateRecordArray(
  value: unknown,
  field: string,
  options: {
    stringFields: string[];
    nullableStringFields?: string[];
    stringArrayFields?: string[];
  },
) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > 100) {
    return `${field} must be an array with no more than 100 items`;
  }

  for (const item of value) {
    if (!isPlainJsonObject(item)) {
      return `${field} contains an invalid item`;
    }
    for (const key of options.stringFields) {
      if (key in item && typeof item[key] !== "string") {
        return `${field}.${key} must be text`;
      }
    }
    for (const key of options.nullableStringFields ?? []) {
      if (key in item && !isStringOrNull(item[key])) {
        return `${field}.${key} must be text or null`;
      }
    }
    for (const key of options.stringArrayFields ?? []) {
      const candidate = item[key];
      if (
        key in item &&
        (!Array.isArray(candidate) ||
          candidate.length > 100 ||
          candidate.some((entry) => typeof entry !== "string"))
      ) {
        return `${field}.${key} must be a text array with no more than 100 items`;
      }
    }
  }

  return null;
}

export function validateResumeDataPayload(value: unknown): string | null {
  if (!isPlainJsonObject(value)) {
    return "Resume data must be an object.";
  }
  if (getSerializedByteLength(value) > MAX_RESUME_DATA_BYTES) {
    return "Resume data is too large.";
  }
  if (Object.keys(value).some((key) => !RESUME_ROOT_KEYS.has(key))) {
    return "Resume data contains unsupported fields.";
  }
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 200) {
    return "Resume data must include a valid name.";
  }

  for (const key of ["headline", "location", "summary"] as const) {
    if (key in value && typeof value[key] !== "string") {
      return `Resume ${key} must be text.`;
    }
  }
  for (const key of ["email", "linkedin", "github", "website", "avatar_url"] as const) {
    if (key in value && !isStringOrNull(value[key])) {
      return `Resume ${key} must be text or null.`;
    }
  }

  const arrayErrors = [
    validateRecordArray(value.experience, "experience", {
      stringFields: ["title", "company", "dates"],
      nullableStringFields: ["url"],
      stringArrayFields: ["highlights"],
    }),
    validateRecordArray(value.education, "education", {
      stringFields: ["degree", "school", "year"],
    }),
    validateRecordArray(value.projects, "projects", {
      stringFields: ["name", "description"],
      nullableStringFields: ["url"],
      stringArrayFields: ["tech"],
    }),
    validateRecordArray(value.skills, "skills", {
      stringFields: ["category"],
      stringArrayFields: ["items"],
    }),
    validateRecordArray(value.certifications, "certifications", {
      stringFields: ["name"],
      nullableStringFields: ["issuer", "date"],
    }),
    validateRecordArray(value.stats, "stats", {
      stringFields: ["value", "label"],
    }),
    validateRecordArray(value.proofs, "proofs", {
      stringFields: ["id", "type", "title", "summary", "outcome"],
      nullableStringFields: ["url", "source_label"],
    }),
    validateRecordArray(value.testimonials, "testimonials", {
      stringFields: ["id", "name", "role", "company", "quote", "status"],
      nullableStringFields: ["relationship", "requested_at", "approved_at"],
    }),
  ].find(Boolean);

  if (arrayErrors) {
    return `${arrayErrors}.`;
  }

  const complexityError = validateJsonComplexity(value);
  return complexityError ? `Resume data ${complexityError}.` : null;
}

export function validatePageConfigPayload(value: unknown): string | null {
  if (!isPlainJsonObject(value)) {
    return "Page configuration must be an object.";
  }
  if (getSerializedByteLength(value) > MAX_PAGE_CONFIG_BYTES) {
    return "Page configuration is too large.";
  }
  if (Object.keys(value).some((key) => !PAGE_CONFIG_KEYS.has(key))) {
    return "Page configuration contains unsupported fields.";
  }

  const complexityError = validateJsonComplexity(value);
  return complexityError ? `Page configuration ${complexityError}.` : null;
}

export function validatePageWriteBodySize(request: Request): string | null {
  const declaredLength = Number(request.headers.get("content-length"));
  return Number.isFinite(declaredLength) && declaredLength > MAX_PAGE_WRITE_BODY_BYTES
    ? "Page payload is too large."
    : null;
}
