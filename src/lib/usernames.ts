export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 40;

export const RESERVED_USERNAME_SLUGS = new Set([
  "acceptable-use",
  "admin",
  "api",
  "callback",
  "cookies",
  "create",
  "dashboard",
  "delete-account",
  "disclaimer",
  "dmca",
  "examples",
  "forgot-password",
  "guides",
  "homepage-preview",
  "legal",
  "login",
  "pricing",
  "privacy",
  "reset-password",
  "security",
  "signup",
  "terms",
  "theme-review",
  "about",
  "blog",
  "docs",
  "help",
  "profile",
  "settings",
  "support",
]);

export function isReservedUsernameSlug(slug: string) {
  return RESERVED_USERNAME_SLUGS.has(normalizeUsernameSlug(slug));
}

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

  const candidate = normalizeUsernameSlug(email.split("@")[0]) || "member";
  return isReservedUsernameSlug(candidate) ? `${candidate}-member` : candidate;
}
