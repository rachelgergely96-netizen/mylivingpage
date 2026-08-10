import type { AtsPersistedTargeting, AtsTargetRole } from "@/types/resume";

export const MAX_SAVED_TARGET_ROLES = 6;
export const MAX_TARGET_ROLE_TITLE_LENGTH = 120;
export const MAX_TARGET_ROLE_DESCRIPTION_LENGTH = 20_000;

export const EMPTY_ATS_TARGETING: AtsPersistedTargeting = {
  savedRoles: [],
  activeRoleId: null,
  lastReviewedAt: null,
};

export function createTargetRoleId(): string {
  return `role-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createTargetRole(input: {
  title: string;
  jobDescription: string;
  savedAt?: string;
}): AtsTargetRole {
  return {
    id: createTargetRoleId(),
    title: input.title.trim().slice(0, MAX_TARGET_ROLE_TITLE_LENGTH),
    jobDescription: input.jobDescription
      .trim()
      .slice(0, MAX_TARGET_ROLE_DESCRIPTION_LENGTH),
    savedAt: input.savedAt ?? new Date().toISOString(),
  };
}

function sanitizeRole(value: unknown): AtsTargetRole | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim().slice(0, 64) : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const jobDescription =
    typeof record.jobDescription === "string" ? record.jobDescription.trim() : "";

  // A role with neither a title nor a description compares against nothing.
  if (!id || (!title && !jobDescription)) {
    return null;
  }

  const savedAt =
    typeof record.savedAt === "string" && !Number.isNaN(Date.parse(record.savedAt))
      ? record.savedAt
      : new Date(0).toISOString();

  return {
    id,
    title: title.slice(0, MAX_TARGET_ROLE_TITLE_LENGTH),
    jobDescription: jobDescription.slice(0, MAX_TARGET_ROLE_DESCRIPTION_LENGTH),
    savedAt,
  };
}

/**
 * Reads whatever is stored at `page_config.ats`.
 *
 * Tolerates the legacy `AtsReviewSnapshot` shape, which held a single
 * `targeting.jobDescription`: that becomes the first saved role so nobody loses
 * the description they last pasted. Everything else in the old snapshot
 * (candidate résumés, scores, proposal decisions) is recomputed, so it is
 * dropped rather than migrated.
 */
export function sanitizeAtsTargeting(value: unknown): AtsPersistedTargeting {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...EMPTY_ATS_TARGETING };
  }

  const record = value as Record<string, unknown>;

  const savedRoles = Array.isArray(record.savedRoles)
    ? record.savedRoles
        .map(sanitizeRole)
        .filter((role): role is AtsTargetRole => role !== null)
        .slice(0, MAX_SAVED_TARGET_ROLES)
    : legacyRolesFromSnapshot(record);

  const requestedActiveId =
    typeof record.activeRoleId === "string" ? record.activeRoleId : null;
  const activeRoleId = savedRoles.some((role) => role.id === requestedActiveId)
    ? requestedActiveId
    : (savedRoles[0]?.id ?? null);

  const lastReviewedAt =
    typeof record.lastReviewedAt === "string" &&
    !Number.isNaN(Date.parse(record.lastReviewedAt))
      ? record.lastReviewedAt
      : null;

  return { savedRoles, activeRoleId, lastReviewedAt };
}

function legacyRolesFromSnapshot(record: Record<string, unknown>): AtsTargetRole[] {
  const targeting = record.targeting;
  if (typeof targeting !== "object" || targeting === null || Array.isArray(targeting)) {
    return [];
  }

  const legacy = targeting as Record<string, unknown>;
  const title = typeof legacy.primaryTitle === "string" ? legacy.primaryTitle.trim() : "";
  const jobDescription =
    typeof legacy.jobDescription === "string" ? legacy.jobDescription.trim() : "";

  if (!title && !jobDescription) {
    return [];
  }

  return [
    {
      id: createTargetRoleId(),
      title: title.slice(0, MAX_TARGET_ROLE_TITLE_LENGTH) || "Saved role",
      jobDescription: jobDescription.slice(0, MAX_TARGET_ROLE_DESCRIPTION_LENGTH),
      savedAt: new Date(0).toISOString(),
    },
  ];
}

export function getActiveTargetRole(
  targeting: AtsPersistedTargeting,
): AtsTargetRole | null {
  return (
    targeting.savedRoles.find((role) => role.id === targeting.activeRoleId) ?? null
  );
}

export function upsertTargetRole(
  targeting: AtsPersistedTargeting,
  role: AtsTargetRole,
): AtsPersistedTargeting {
  const existingIndex = targeting.savedRoles.findIndex(
    (saved) => saved.id === role.id,
  );

  const savedRoles =
    existingIndex >= 0
      ? targeting.savedRoles.map((saved, index) =>
          index === existingIndex ? role : saved,
        )
      : [role, ...targeting.savedRoles].slice(0, MAX_SAVED_TARGET_ROLES);

  return { ...targeting, savedRoles, activeRoleId: role.id };
}

export function removeTargetRole(
  targeting: AtsPersistedTargeting,
  roleId: string,
): AtsPersistedTargeting {
  const savedRoles = targeting.savedRoles.filter((role) => role.id !== roleId);

  return {
    ...targeting,
    savedRoles,
    activeRoleId:
      targeting.activeRoleId === roleId
        ? (savedRoles[0]?.id ?? null)
        : targeting.activeRoleId,
  };
}

export function selectTargetRole(
  targeting: AtsPersistedTargeting,
  roleId: string | null,
): AtsPersistedTargeting {
  if (roleId !== null && !targeting.savedRoles.some((role) => role.id === roleId)) {
    return targeting;
  }

  return { ...targeting, activeRoleId: roleId };
}
