export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 40;

export interface UsernameValidationResult {
  slug: string;
  error: string | null;
}

export function normalizeUsernameSlug(source: string): string {
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\-_]+|[.\-_]+$/g, "");
}

export function validateUsernameSlug(source: string): UsernameValidationResult {
  const slug = normalizeUsernameSlug(source);

  if (!slug) {
    return { slug, error: "URL is required." };
  }

  if (slug.length < USERNAME_MIN_LENGTH) {
    return { slug, error: `URL must be at least ${USERNAME_MIN_LENGTH} characters.` };
  }

  if (slug.length > USERNAME_MAX_LENGTH) {
    return { slug, error: `URL must be ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }

  return { slug, error: null };
}

// Legacy helper for fallback generation only. Do not use this for validating user input.
export function slugifyUsername(source: string): string {
  return normalizeUsernameSlug(source) || "member";
}

export function usernameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return "member";
  }

  return normalizeUsernameSlug(email.split("@")[0]) || "member";
}
